<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/** Staff account management. Every route here is behind the "admin" middleware. */
class UserController extends Controller
{
    /** GET /api/users */
    public function index(): AnonymousResourceCollection
    {
        return UserResource::collection(User::orderBy('name')->get());
    }

    /** POST /api/users: the admin chooses the role here ("role" is not mass-assignable). */
    public function store(UserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = new User([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);
        $user->role = $data['role'];
        $user->save();

        return (new UserResource($user->refresh()))->response()->setStatusCode(201);
    }

    /** PUT/PATCH /api/users/{user} */
    public function update(UserRequest $request, User $user): UserResource
    {
        $data = $request->validated();

        // Never leave the shop without an admin.
        if ($user->isAdmin()
            && $data['role'] !== User::ROLE_ADMIN
            && User::where('role', User::ROLE_ADMIN)->count() <= 1) {
            throw ValidationException::withMessages([
                'role' => ['There must be at least one admin. Promote another user first.'],
            ]);
        }

        $roleChanged = $user->role !== $data['role'];
        $passwordChanged = ! empty($data['password']);

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->role = $data['role'];
        if ($passwordChanged) {
            $user->password = $data['password']; // hashed by the model cast
        }
        $user->save();

        // A changed role or password signs that user out everywhere (their old tokens stop working).
        if (($roleChanged || $passwordChanged) && (int) $user->id !== (int) $request->user()->id) {
            $user->tokens()->delete();
        }

        return new UserResource($user);
    }

    /** DELETE /api/users/{user} */
    public function destroy(Request $request, User $user): Response
    {
        if ((int) $user->id === (int) $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 409);
        }

        if ($user->stockMovements()->exists()
            || $user->requestedOrders()->exists()
            || $user->approvedOrders()->exists()
            || $user->receivedOrders()->exists()) {
            return response()->json([
                'message' => 'This user cannot be deleted because they have stock movements or purchase orders on record.',
            ], 409);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->noContent();
    }
}