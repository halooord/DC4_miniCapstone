<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** A token stops working after this many days. The user must log in again. */
    private const TOKEN_LIFETIME_DAYS = 7;

    /**
     * POST /api/register
     * Always creates a STAFF account. "role" is not fillable, and we only read
     * validated name/email/password, so a "role" in the request is ignored.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'], // hashed automatically by the model cast
        ])->refresh(); // reload so the database default role ("staff") is present

        return response()->json([
            'message' => 'Account created successfully.',
            'user' => new UserResource($user),
            'token' => $this->issueToken($user),
        ], 201);
    }

    /**
     * POST /api/login
     * A wrong email and a wrong password give the same message, so an attacker
     * cannot learn which emails exist.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The email or password is incorrect.'],
            ]);
        }

        return response()->json([
            'message' => 'Login successful.',
            'user' => new UserResource($user),
            'token' => $this->issueToken($user),
        ]);
    }

    /**
     * POST /api/logout  (requires a valid token)
     * Deletes ONLY the token used for this request, so the token stops working.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    /** GET /api/user  (requires a valid token) */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    private function issueToken(User $user): string
    {
        return $user->createToken(
            'react-app',
            ['*'],
            now()->addDays(self::TOKEN_LIFETIME_DAYS)
        )->plainTextToken;
    }
}