<?php

use App\Models\Student;
use App\Models\User;

function validApiRegistrationPayload(array $overrides = []): array
{
    return array_merge([
        'student_id' => '02000123456',
        'full_name' => 'Juan Dela Cruz',
        'last_name' => 'Dela Cruz',
        'course' => 'BSIT',
        'year_level' => '1',
        'email' => 'delacruz.123456@sti.edu.ph',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
        'terms' => true,
        'device_name' => 'Pixel 8',
    ], $overrides);
}

test('a student can register from the mobile app and is signed in immediately', function () {
    $response = $this->postJson('/api/v1/auth/register', validApiRegistrationPayload());

    $response->assertCreated()
        ->assertJsonPath('data.user.email', 'delacruz.123456@sti.edu.ph')
        ->assertJsonPath('data.user.role', 'student')
        ->assertJsonPath('data.user.must_change_password', false)
        ->assertJsonStructure(['data' => ['token', 'token_type', 'expires_at', 'user']]);

    $user = User::where('email', 'delacruz.123456@sti.edu.ph')->first();

    expect($user)->not->toBeNull();
    expect($user->student)->not->toBeNull();
    expect($user->student->student_id)->toBe('02000123456');

    // The token just issued works immediately.
    $this->withToken($response->json('data.token'))
        ->getJson('/api/v1/auth/me')
        ->assertOk();
});

test('the same student ID cannot be registered twice from mobile', function () {
    $this->postJson('/api/v1/auth/register', validApiRegistrationPayload());

    $response = $this->postJson('/api/v1/auth/register', validApiRegistrationPayload([
        'email' => 'delacruz.123456@sti.edu.ph',
    ]));

    $response->assertUnprocessable()->assertJsonValidationErrors('student_id');

    expect(User::where('email', 'delacruz.123456@sti.edu.ph')->count())->toBe(1);
});

test('the submitted email must match the auto-generated school email pattern on mobile too', function () {
    $response = $this->postJson('/api/v1/auth/register', validApiRegistrationPayload([
        'email' => 'someone.else@sti.edu.ph',
    ]));

    $response->assertUnprocessable()->assertJsonValidationErrors('email');

    expect(User::where('name', 'Juan Dela Cruz')->exists())->toBeFalse();
});

test('the year level must be numeric and cannot be 0 when registering from mobile', function () {
    $this->postJson('/api/v1/auth/register', validApiRegistrationPayload([
        'year_level' => 'first year',
    ]))->assertUnprocessable()->assertJsonValidationErrors('year_level');

    $this->postJson('/api/v1/auth/register', validApiRegistrationPayload([
        'year_level' => '0',
    ]))->assertUnprocessable()->assertJsonValidationErrors('year_level');

    expect(Student::query()->count())->toBe(0);
});

test('the password must meet the shared policy when registering from mobile', function () {
    $response = $this->postJson('/api/v1/auth/register', validApiRegistrationPayload([
        'password' => 'weak',
        'password_confirmation' => 'weak',
    ]));

    $response->assertUnprocessable()->assertJsonValidationErrors('password');

    expect(Student::query()->count())->toBe(0);
});

test('registering from mobile requires accepting the terms', function () {
    $response = $this->postJson('/api/v1/auth/register', validApiRegistrationPayload([
        'terms' => false,
    ]));

    $response->assertUnprocessable()->assertJsonValidationErrors('terms');
});
