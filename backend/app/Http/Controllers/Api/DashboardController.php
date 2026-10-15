<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\StockMovementResource;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard (admin and staff)
     *
     * Calculation rules:
     *  - total_products        = number of rows in products
     *  - low_stock_count       = products where stock_qty <= reorder_level
     *  - pending_orders        = purchase orders with status "pending"
     *  - approved_orders       = purchase orders with status "approved" (waiting to be received)
     *  - inventory_value       = SUM(price * stock_qty), at selling price
     *  - movements_this_week   = stock movements created since Monday 00:00 of the current week
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $weekStart = now()->startOfWeek();

        $inventoryValue = Product::query()
            ->selectRaw('COALESCE(SUM(price * stock_qty), 0) as value')
            ->value('value');

        $lowStock = Product::with('category')->lowStock()->orderBy('stock_qty')->limit(5)->get();

        $recent = StockMovement::with(['product', 'user'])
            ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id)) // staff: own only
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'total_products' => Product::count(),
                'low_stock_count' => Product::lowStock()->count(),
                'pending_orders' => PurchaseOrder::where('status', PurchaseOrder::STATUS_PENDING)->count(),
                'approved_orders' => PurchaseOrder::where('status', PurchaseOrder::STATUS_APPROVED)->count(),
                'inventory_value' => round((float) $inventoryValue, 2),
                'movements_this_week' => StockMovement::where('created_at', '>=', $weekStart)->count(),
                'week_starts_on' => $weekStart->toDateString(),
                'low_stock_products' => ProductResource::collection($lowStock)->resolve(),
                'recent_movements' => StockMovementResource::collection($recent)->resolve(),
            ],
        ]);
    }
}