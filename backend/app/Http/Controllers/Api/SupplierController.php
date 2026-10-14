<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class SupplierController extends Controller
{
    /** GET /api/suppliers (admin and staff) */
    public function index(): AnonymousResourceCollection
    {
        $suppliers = Supplier::withCount('products')->orderBy('name')->get();

        return SupplierResource::collection($suppliers);
    }

    /** GET /api/suppliers/{supplier} (admin and staff) */
    public function show(Supplier $supplier): SupplierResource
    {
        return new SupplierResource($supplier->loadCount(['products', 'purchaseOrders']));
    }

    /** POST /api/suppliers (admin only) */
    public function store(SupplierRequest $request): JsonResponse
    {
        $supplier = Supplier::create($request->validated());

        return (new SupplierResource($supplier))->response()->setStatusCode(201);
    }

    /** PUT/PATCH /api/suppliers/{supplier} (admin only) */
    public function update(SupplierRequest $request, Supplier $supplier): SupplierResource
    {
        $supplier->update($request->validated());

        return new SupplierResource($supplier->loadCount('products'));
    }

    /** DELETE /api/suppliers/{supplier} (admin only) */
    public function destroy(Supplier $supplier): Response
    {
        if ($supplier->products()->exists() || $supplier->purchaseOrders()->exists()) {
            return response()->json([
                'message' => 'This supplier cannot be deleted because it has products or purchase orders on record.',
            ], 409);
        }

        $supplier->delete();

        return response()->noContent();
    }
}