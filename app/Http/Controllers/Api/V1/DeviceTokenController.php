<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class DeviceTokenController extends Controller
{
    /**
     * Register (or refresh) this phone's Firebase token so it receives push
     * notifications.
     *
     * The token belongs to this sign-in: when the sign-in ends (log out, or
     * the session is ended after a password change) the row is deleted with
     * it. A token already registered by another account on the same phone is
     * moved to this one.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $accessToken = $request->user()->currentAccessToken();

        abort_unless($accessToken instanceof PersonalAccessToken, 401);

        DeviceToken::query()
            ->where('personal_access_token_id', $accessToken->getKey())
            ->where('token', '!=', $validated['token'])
            ->delete();

        DeviceToken::query()->updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => $request->user()->id,
                'personal_access_token_id' => $accessToken->getKey(),
                'platform' => 'android',
                'device_name' => $validated['device_name'] ?? null,
            ],
        );

        return response()->json([
            'message' => 'This phone will now receive notifications.',
        ]);
    }

    /**
     * Stop push notifications to this phone (used just before logging out).
     */
    public function destroy(Request $request): JsonResponse
    {
        $accessToken = $request->user()->currentAccessToken();

        if ($accessToken instanceof PersonalAccessToken) {
            DeviceToken::query()
                ->where('personal_access_token_id', $accessToken->getKey())
                ->delete();
        }

        return response()->json([
            'message' => 'This phone will no longer receive notifications.',
        ]);
    }
}
