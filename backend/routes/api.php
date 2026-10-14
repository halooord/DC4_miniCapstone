<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// ---------- Public routes (no token needed) ----------
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// ---------- Protected routes (valid Bearer token required) ----------
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    // ---------- Admin-only routes ----------
    Route::middleware('admin')->prefix('admin')->group(function () {
        // TEMPORARY: used only to test the admin middleware. We delete it in Step 8.
        Route::get('/ping', fn () => response()->json(['message' => 'Admin access confirmed.']));
    });
});