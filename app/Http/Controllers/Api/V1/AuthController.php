<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Resources\Api\V1\UserResource;
use App\Services\AccountAuthenticator;
use App\Services\StudentRegistrar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly AccountAuthenticator $authenticator,
        private readonly StudentRegistrar $registrar,
    ) {}

    /**
     * Register a new student account from the mobile app and sign them
     * straight in, the same way the website's registration form does.
     *
     * Validation and account creation are StudentRegistrar's job, shared
     * with the website's own registration action, so a student registering
     * from the phone is held to the exact same rules as one registering
     * from a browser.
     */
    public function register(Request $request): JsonResponse
    {
        $user = $this->registrar->register($request->all());

        $deviceName = (string) ($request->input('device_name') ?: 'mobile');

        $token = $user->createToken($deviceName, ['student']);

        return response()->json([
            'data' => [
                'token' => $token->plainTextToken,
                'token_type' => 'Bearer',
                'expires_at' => now()
                    ->addMinutes((int) config('sanctum.expiration'))
                    ->toIso8601String(),
                'user' => new UserResource($user->load('student')),
            ],
        ], 201);
    }

    /**
     * Sign a student in and hand the mobile app a token.
     *
     * The credential rules (lockout, disabled and inactive accounts, the
     * messages) come from AccountAuthenticator, the same code the website uses.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->authenticator->authenticate(
            (string) $request->input('email'),
            (string) $request->input('password'),
            $request,
        );

        if ($user->role !== 'student') {
            throw ValidationException::withMessages([
                'email' => 'The mobile app is for students only. Please use the PROWARE website.',
            ]);
        }

        $deviceName = (string) ($request->input('device_name') ?: 'mobile');

        // One token per device: signing in again replaces the old one.
        $user->tokens()->where('name', $deviceName)->delete();

        $token = $user->createToken($deviceName, ['student']);

        return response()->json([
            'data' => [
                'token' => $token->plainTextToken,
                'token_type' => 'Bearer',
                'expires_at' => now()
                    ->addMinutes((int) config('sanctum.expiration'))
                    ->toIso8601String(),
                'user' => new UserResource($user->load('student')),
            ],
        ]);
    }

    /**
     * The signed-in student.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()->load('student')),
        ]);
    }

    /**
     * Sign out of this device only.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Signed out.',
        ]);
    }
}
