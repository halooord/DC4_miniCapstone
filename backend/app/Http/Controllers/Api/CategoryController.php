<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class CategoryController extends Controller
{
    /** GET /api/categories (admin and staff) */
    public function index(): AnonymousResourceCollection
    {
        $categories = Category::withCount('products')->orderBy('name')->get();

        return CategoryResource::collection($categories);
    }

    /** GET /api/categories/{category} (admin and staff) */
    public function show(Category $category): CategoryResource
    {
        return new CategoryResource($category->loadCount('products'));
    }

    /** POST /api/categories (admin only) */
    public function store(CategoryRequest $request): JsonResponse
    {
        $category = Category::create($request->validated());

        return (new CategoryResource($category))->response()->setStatusCode(201);
    }

    /** PUT/PATCH /api/categories/{category} (admin only) */
    public function update(CategoryRequest $request, Category $category): CategoryResource
    {
        $category->update($request->validated());

        return new CategoryResource($category->loadCount('products'));
    }

    /** DELETE /api/categories/{category} (admin only) */
    public function destroy(Category $category): Response
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'This category cannot be deleted because it still has products. Move or remove those products first.',
            ], 409);
        }

        $category->delete();

        return response()->noContent();
    }
}