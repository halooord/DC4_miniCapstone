<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// ---------- Public routes (no token needed) ----------
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// ---------- Protected routes (valid Bearer token required) ----------
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::get('/dashboard', DashboardController::class);

    // Read-only for admin AND staff
    Route::apiResource('categories', CategoryController::class)->only(['index', 'show']);
    Route::apiResource('suppliers', SupplierController::class)->only(['index', 'show']);
    Route::apiResource('products', ProductController::class)->only(['index', 'show']);

    // Stock movements are append-only: list them and record new ones, never edit or delete.
    Route::apiResource('stock-movements', StockMovementController::class)->only(['index', 'store']);

    // Purchase orders: everyone logged in may list, view, create, edit/delete their own pending
    // orders (ownership is checked by PurchaseOrderPolicy) and mark approved orders as received.
    Route::apiResource('purchase-orders', PurchaseOrderController::class);
    Route::post('purchase-orders/{purchase_order}/receive', [PurchaseOrderController::class, 'receive']);

    // ---------- Admin-only routes (staff get 403) ----------
    Route::middleware('admin')->group(function () {
        Route::apiResource('categories', CategoryController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('suppliers', SupplierController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('products', ProductController::class)->only(['store', 'update', 'destroy']);

        Route::post('purchase-orders/{purchase_order}/approve', [PurchaseOrderController::class, 'approve']);
        Route::post('purchase-orders/{purchase_order}/reject', [PurchaseOrderController::class, 'reject']);

        Route::apiResource('users', UserController::class)->except(['show']);
    });
});