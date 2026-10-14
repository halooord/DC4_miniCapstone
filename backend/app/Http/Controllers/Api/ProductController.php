<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class ProductController extends Controller
{
    /**
     * GET /api/products  (admin and staff)
     * Query string: ?search=egg &category_id=2 &supplier_id=1 &low_stock=1 &per_page=10 &page=2
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'integer'],
            'supplier_id' => ['nullable', 'integer'],
            'low_stock' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $products = Product::with(['category', 'supplier'])   // eager loading: avoids N+1 queries
            ->search($request->query('search'))               // name or SKU
            ->inCategory($request->query('category_id'))
            ->when($request->filled('supplier_id'), fn ($q) => $q->where('supplier_id', $request->query('supplier_id')))
            ->when($request->boolean('low_stock'), fn ($q) => $q->lowStock())
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 10))
            ->withQueryString();                              // page links keep the filters

        return ProductResource::collection($products);
    }

    /** GET /api/products/{product} (admin and staff) */
    public function show(Product $product): ProductResource
    {
        return new ProductResource($product->load(['category', 'supplier']));
    }

    /** POST /api/products (admin only). New products start with 0 stock. */
    public function store(ProductRequest $request): JsonResponse
    {
        $product = Product::create($request->validated());

        return (new ProductResource($product->refresh()->load(['category', 'supplier'])))
            ->response()
            ->setStatusCode(201);
    }

    /** PUT/PATCH /api/products/{product} (admin only). Stock cannot be changed here. */
    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $product->update($request->validated());

        return new ProductResource($product->load(['category', 'supplier']));
    }

    /** DELETE /api/products/{product} (admin only). Blocked when history exists. */
    public function destroy(Product $product): Response
    {
        if ($product->stockMovements()->exists() || $product->purchaseOrderItems()->exists()) {
            return response()->json([
                'message' => 'This product cannot be deleted because it has stock movements or purchase orders on record.',
            ], 409);
        }

        $product->delete();

        return response()->noContent();
    }
}