<?php

namespace Database\Factories;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<DeviceToken>
 */
class DeviceTokenFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * The phone's sign-in (Sanctum token) is created for the same user, so the
     * row behaves like a real registration.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $user = User::factory()->create(['role' => User::ROLE_STUDENT]);

        return [
            'user_id' => $user->id,
            'personal_access_token_id' => $user->createToken('Test phone')->accessToken->id,
            'token' => Str::random(160),
            'platform' => 'android',
            'device_name' => 'Pixel 8',
        ];
    }
}
