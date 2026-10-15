<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrderRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class PurchaseOrderController extends Controller
{
    /** Relationships loaded for every response (eager loading). */
    private const RELATIONS = ['supplier', 'requester', 'approver', 'receiver', 'items.product'];

    /**
     * GET /api/purchase-orders
     * Query string: ?status=pending &supplier_id=1 &page=2
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'approved', 'received', 'rejected'])],
            'supplier_id' => ['nullable', 'integer'],
        ]);

        $orders = PurchaseOrder::with(self::RELATIONS)
            ->status($request->query('status'))
            ->when($request->filled('supplier_id'), fn ($q) => $q->where('supplier_id', $request->query('supplier_id')))
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString();

        return PurchaseOrderResource::collection($orders);
    }

    /** GET /api/purchase-orders/{purchase_order} */
    public function show(PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        return new PurchaseOrderResource($purchaseOrder->load(self::RELATIONS));
    }

    /** POST /api/purchase-orders: always starts as "pending", requested by the logged-in user. */
    public function store(PurchaseOrderRequest $request): JsonResponse
    {
        $data = $request->validated();

        $order = DB::transaction(function () use ($data, $request) {
            $order = PurchaseOrder::create([
                'supplier_id' => $data['supplier_id'],
                'requested_by' => $request->user()->id,
                'notes' => $data['notes'] ?? null,
            ]);

            $order->items()->createMany($data['items']);

            return $order;
        });

        return (new PurchaseOrderResource($order->refresh()->load(self::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }

    /** PUT/PATCH /api/purchase-orders/{purchase_order}: only the requester (or an admin), only while pending. */
    public function update(PurchaseOrderRequest $request, PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        Gate::authorize('update', $purchaseOrder);   // 403 if this is someone else's order
        $data = $request->validated();

        DB::transaction(function () use ($purchaseOrder, $data) {
            $order = $this->lockWithStatus($purchaseOrder, 'pending', 'edited'); // 409 if no longer pending

            $order->update([
                'supplier_id' => $data['supplier_id'],
                'notes' => $data['notes'] ?? null,
            ]);

            // Replace the whole item list with the submitted one.
            $order->items()->delete();
            $order->items()->createMany($data['items']);
        });

        return new PurchaseOrderResource($purchaseOrder->refresh()->load(self::RELATIONS));
    }

    /** DELETE /api/purchase-orders/{purchase_order}: only the requester (or an admin), only while pending. */
    public function destroy(PurchaseOrder $purchaseOrder): Response
    {
        Gate::authorize('delete', $purchaseOrder);

        DB::transaction(function () use ($purchaseOrder) {
            $order = $this->lockWithStatus($purchaseOrder, 'pending', 'deleted');
            $order->delete(); // its items are removed by the database (cascade)
        });

        return response()->noContent();
    }

    /** POST /api/purchase-orders/{purchase_order}/approve (admin only): pending -> approved */
    public function approve(Request $request, PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        Gate::authorize('approve', $purchaseOrder);

        DB::transaction(function () use ($request, $purchaseOrder) {
            $order = $this->lockWithStatus($purchaseOrder, 'pending', 'approved');
            $order->status = PurchaseOrder::STATUS_APPROVED;
            $order->approved_by = $request->user()->id;
            $order->approved_at = now();
            $order->save();
        });

        return new PurchaseOrderResource($purchaseOrder->refresh()->load(self::RELATIONS));
    }

    /** POST /api/purchase-orders/{purchase_order}/reject (admin only): pending -> rejected */
    public function reject(Request $request, PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        Gate::authorize('reject', $purchaseOrder);

        DB::transaction(function () use ($request, $purchaseOrder) {
            $order = $this->lockWithStatus($purchaseOrder, 'pending', 'rejected');
            $order->status = PurchaseOrder::STATUS_REJECTED;
            $order->approved_by = $request->user()->id;   // records who made the decision
            $order->approved_at = now();
            $order->save();
        });

        return new PurchaseOrderResource($purchaseOrder->refresh()->load(self::RELATIONS));
    }

    /**
     * POST /api/purchase-orders/{purchase_order}/receive: approved -> received
     *
     * In ONE transaction: lock the order, check it is still "approved", add every item's quantity
     * to its product, log a stock movement for each item, and mark the order received.
     * If anything fails, everything is rolled back. A second call finds the status is already
     * "received" and is refused with 409, so stock can never be added twice.
     */
    public function receive(Request $request, PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        Gate::authorize('receive', $purchaseOrder);
        $user = $request->user();

        DB::transaction(function () use ($purchaseOrder, $user) {
            $order = $this->lockWithStatus($purchaseOrder, 'approved', 'received');

            // Same product order every time, so two orders can never lock each other (deadlock).
            foreach ($order->items()->orderBy('product_id')->get() as $item) {
                $product = Product::whereKey($item->product_id)->lockForUpdate()->firstOrFail();
                $product->stock_qty = round((float) $product->stock_qty + (float) $item->quantity, 2);
                $product->save();

                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $user->id,
                    'purchase_order_id' => $order->id,
                    'type' => StockMovement::TYPE_IN,
                    'quantity' => $item->quantity,
                    'reason' => "Received from purchase order #{$order->id}",
                ]);
            }

            $order->status = PurchaseOrder::STATUS_RECEIVED;
            $order->received_by = $user->id;
            $order->received_at = now();
            $order->save();
        });

        return new PurchaseOrderResource($purchaseOrder->refresh()->load(self::RELATIONS));
    }

    /**
     * Re-reads the order with a database lock and makes sure it is in the required status.
     * If not, the request is answered with 409 Conflict (and the transaction is rolled back).
     */
    private function lockWithStatus(PurchaseOrder $order, string $required, string $action): PurchaseOrder
    {
        $locked = PurchaseOrder::whereKey($order->id)->lockForUpdate()->firstOrFail();

        if ($locked->status !== $required) {
            throw new HttpResponseException(response()->json([
                'message' => "Only {$required} orders can be {$action}. This order is {$locked->status}.",
            ], 409));
        }

        return $locked;
    }
}