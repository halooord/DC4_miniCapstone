<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StockMovementRequest;
use App\Http\Resources\StockMovementResource;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StockMovementController extends Controller
{
    /**
     * GET /api/stock-movements
     * Admin sees everything. Staff see only the movements they recorded themselves.
     * Query string: ?product_id= &type= &user_id= (admin only) &date_from= &date_to= &page=
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'product_id' => ['nullable', 'integer'],
            'type' => ['nullable', Rule::in(['in', 'out', 'spoilage', 'adjustment'])],
            'user_id' => ['nullable', 'integer'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $user = $request->user();

        $movements = StockMovement::with(['product', 'user'])
            ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))
            ->when($user->isAdmin() && ! empty($filters['user_id']), fn ($q) => $q->where('user_id', $filters['user_id']))
            ->when(! empty($filters['product_id']), fn ($q) => $q->where('product_id', $filters['product_id']))
            ->when(! empty($filters['type']), fn ($q) => $q->where('type', $filters['type']))
            ->when(! empty($filters['date_from']), fn ($q) => $q->whereDate('created_at', '>=', $filters['date_from']))
            ->when(! empty($filters['date_to']), fn ($q) => $q->whereDate('created_at', '<=', $filters['date_to']))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        return StockMovementResource::collection($movements);
    }

    /**
     * POST /api/stock-movements (admin and staff)
     * Saves the movement AND updates the product's stock in one database transaction.
     */
    public function store(StockMovementRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $movement = DB::transaction(function () use ($data, $user) {
            // Lock the product row so two people cannot change its stock at the same moment.
            $product = Product::whereKey($data['product_id'])->lockForUpdate()->firstOrFail();

            $change = $this->stockChange($data['type'], $data['direction'] ?? null, (float) $data['quantity']);
            $newStock = round((float) $product->stock_qty + $change, 2);

            if ($newStock < 0) {
                $available = (float) $product->stock_qty;

                // Throwing inside the transaction cancels everything (nothing is saved).
                throw ValidationException::withMessages([
                    'quantity' => ["Not enough stock. Only {$available} {$product->unit} available."],
                ]);
            }

            $product->stock_qty = $newStock;
            $product->save();

            return StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $user->id,
                'type' => $data['type'],
                'direction' => $data['type'] === StockMovement::TYPE_ADJUSTMENT ? $data['direction'] : null,
                'quantity' => $data['quantity'],
                'reason' => $data['reason'] ?? null,
            ]);
        });

        return (new StockMovementResource($movement->load(['product', 'user'])))
            ->response()
            ->setStatusCode(201);
    }

    /** How much the stock goes up (+) or down (-) for this movement. */
    private function stockChange(string $type, ?string $direction, float $quantity): float
    {
        return match ($type) {
            StockMovement::TYPE_IN => $quantity,
            StockMovement::TYPE_OUT, StockMovement::TYPE_SPOILAGE => -$quantity,
            default => $direction === StockMovement::DIRECTION_INCREASE ? $quantity : -$quantity,
        };
    }
}