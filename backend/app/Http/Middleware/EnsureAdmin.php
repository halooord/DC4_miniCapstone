<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * Lets the request through only if the logged-in user is an admin.
     * Must run AFTER auth:sanctum, which is what identifies the user.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isAdmin()) {
            return response()->json([
                'message' => 'This action is unauthorized. Admin access is required.',
            ], 403);
        }

        return $next($request);
    }
}