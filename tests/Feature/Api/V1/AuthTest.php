<?php

use App\Models\Student;
use App\Models\User;
use App\Services\AccountAuthenticator;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

function apiAuthStudent(array $userOverrides = [], array $studentOverrides = []): User
{
    $user = User::factory()->create(array_merge([
        'role' => User::ROLE_STUDENT,
        'is_active' => true,
        'password' => Hash::make('correct-password'),
    ], $userOverrides));

    Student::query()->create(array_merge([
        'user_id' => $user->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '3',
        'status' => 'active',
    ], $studentOverrides));

    return $user->fresh('student');
}

function apiAuthLogin($test, string $email, string $password, array $extra = [])
{
    return $test->postJson('/api/v1/auth/login', array_merge([
        'email' => $email,
        'password' => $password,
    ], $extra));
}

test('a student signs in and gets a token that opens their own account', function () {
    $user = apiAuthStudent();

    $response = apiAuthLogin($this, $user->email, 'correct-password', ['device_name' => 'Pixel 8']);

    $response->assertOk()
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonPath('data.user.email', $user->email)
        ->assertJsonPath('data.user.role', 'student')
        ->assertJsonPath('data.user.student.student_id', $user->student->student_id)
        ->assertJsonPath('data.user.student.course', 'BSIT')
        ->assertJsonPath('data.user.must_change_password', false);

    expect($response->json('data.token'))->toBeString()->not->toBeEmpty()
        ->and($response->json('data.expires_at'))->toBeString();

    $this->withToken($response->json('data.token'))
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.email', $user->email);
});

test('the email is trimmed and lowercased like the website', function () {
    $user = apiAuthStudent(['email' => 'mixed.case@example.test']);

    apiAuthLogin($this, '  Mixed.Case@Example.TEST ', 'correct-password')->assertOk();
});

test('a wrong password and an unknown email give the identical message', function () {
    $user = apiAuthStudent();

    $wrongPassword = apiAuthLogin($this, $user->email, 'wrong-password');
    $unknownEmail = apiAuthLogin($this, 'nobody@example.test', 'whatever');

    $wrongPassword->assertUnprocessable()->assertJsonValidationErrors(['email' => 'Invalid credentials.']);
    $unknownEmail->assertUnprocessable()->assertJsonValidationErrors(['email' => 'Invalid credentials.']);
});

test('missing fields use the same messages as the website', function () {
    $this->postJson('/api/v1/auth/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'email' => 'The email field is required.',
            'password' => 'The password field is required.',
        ]);
});

test('five wrong passwords lock the account and end its mobile sessions', function () {
    $user = apiAuthStudent();
    $activeSession = $user->createToken('Pixel 8', ['student']);

    for ($attempt = 0; $attempt < 5; $attempt++) {
        apiAuthLogin($this, $user->email, 'wrong-password')->assertUnprocessable();
    }

    $user->refresh();

    expect($user->isLocked())->toBeTrue()
        ->and($user->is_active)->toBeFalse()
        ->and($user->tokens()->count())->toBe(0);

    // Past the per-minute limiter, the correct password still cannot get in.
    $this->travel(2)->minutes();

    apiAuthLogin($this, $user->email, 'correct-password')
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'email' => 'This account has been locked due to too many failed login attempts. Please contact an administrator.',
        ]);

    $this->withToken($activeSession->plainTextToken)
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized();
});

test('the attempt that locks the account says so, and the next one inside the minute gets the lockout message, not a rate limit', function () {
    $user = apiAuthStudent();

    for ($attempt = 0; $attempt < 4; $attempt++) {
        apiAuthLogin($this, $user->email, 'wrong-password')
            ->assertJsonValidationErrors(['email' => 'Invalid credentials.']);
    }

    apiAuthLogin($this, $user->email, 'wrong-password')
        ->assertJsonValidationErrors(['email' => AccountAuthenticator::LOCKED_MESSAGE]);

    apiAuthLogin($this, $user->email, 'correct-password')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email' => AccountAuthenticator::LOCKED_MESSAGE]);
});

test('the per-minute rate limit only kicks in after 10 attempts and tells the app when to retry', function () {
    $user = apiAuthStudent();

    for ($attempt = 0; $attempt < AccountAuthenticator::LOGIN_ATTEMPTS_PER_MINUTE; $attempt++) {
        apiAuthLogin($this, $user->email, 'wrong-password')->assertUnprocessable();
    }

    apiAuthLogin($this, $user->email, 'wrong-password')
        ->assertStatus(429)
        ->assertHeader('Retry-After')
        ->assertJsonPath('message', fn (string $message) => str_starts_with($message, 'Too many login attempts.'));
});

test('a disabled account gets the website message and no token', function () {
    $user = apiAuthStudent(['is_active' => false]);

    apiAuthLogin($this, $user->email, 'correct-password')
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'email' => 'This PROWARE account has been disabled. Please contact the administrator.',
        ]);

    expect($user->tokens()->count())->toBe(0);
});

test('a student with an inactive record gets the website message', function () {
    $user = apiAuthStudent([], ['status' => 'inactive']);

    apiAuthLogin($this, $user->email, 'correct-password')
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'email' => 'This student account is currently inactive. Please contact the PROWARE administrator.',
        ]);
});

test('a student account with no student record gets the website message', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_STUDENT,
        'is_active' => true,
        'password' => Hash::make('correct-password'),
    ]);

    apiAuthLogin($this, $user->email, 'correct-password')
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'email' => 'This student account is not properly linked to a student record. Please contact the PROWARE administrator.',
        ]);
});

test('staff accounts are told the app is for students only and get no token', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'is_active' => true,
        'password' => Hash::make('correct-password'),
    ]);

    apiAuthLogin($this, $user->email, 'correct-password')
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'email' => 'The mobile app is for students only. Please use the PROWARE website.',
        ]);

    expect($user->tokens()->count())->toBe(0);
})->with([User::ROLE_CASHIER, User::ROLE_SPECIALIST, User::ROLE_ADMIN, User::ROLE_SUPER_ADMIN]);

test('the account payload tells the app when a password change is required', function () {
    $user = apiAuthStudent(['must_change_password' => true]);

    apiAuthLogin($this, $user->email, 'correct-password')
        ->assertOk()
        ->assertJsonPath('data.user.must_change_password', true);
});

test('signing in again on the same device replaces its token', function () {
    $user = apiAuthStudent();

    $first = apiAuthLogin($this, $user->email, 'correct-password', ['device_name' => 'Pixel 8'])->json('data.token');
    $second = apiAuthLogin($this, $user->email, 'correct-password', ['device_name' => 'Pixel 8'])->json('data.token');

    expect($user->tokens()->count())->toBe(1);

    $this->withToken($first)->getJson('/api/v1/auth/me')->assertUnauthorized();
    $this->app['auth']->forgetGuards();
    $this->withToken($second)->getJson('/api/v1/auth/me')->assertOk();
});

test('signing out ends only that device session', function () {
    $user = apiAuthStudent();

    $phone = apiAuthLogin($this, $user->email, 'correct-password', ['device_name' => 'Phone'])->json('data.token');
    $tablet = apiAuthLogin($this, $user->email, 'correct-password', ['device_name' => 'Tablet'])->json('data.token');

    $this->withToken($phone)->postJson('/api/v1/auth/logout')->assertOk();

    expect($user->tokens()->pluck('name')->all())->toBe(['Tablet']);

    $this->app['auth']->forgetGuards();
    $this->withToken($tablet)->getJson('/api/v1/auth/me')->assertOk();
});

test('a request without a token is rejected', function () {
    $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    $this->postJson('/api/v1/auth/logout')->assertUnauthorized();
});

test('a token stops working when the account changes state', function (array $changes) {
    $user = apiAuthStudent();
    $token = $user->createToken('Pixel 8', ['student'])->plainTextToken;

    $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();

    $this->app['auth']->forgetGuards();

    if (isset($changes['student'])) {
        $user->student->update($changes['student']);
    } else {
        $user->forceFill($changes)->save();
    }

    $this->withToken($token)
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Your session is no longer valid. Please sign in again.');

    expect(PersonalAccessToken::query()->count())->toBe(0);
})->with([
    'deactivated' => [['is_active' => false]],
    'locked' => [['locked_at' => '2026-09-20 08:00:00']],
    'moved to staff' => [['role' => User::ROLE_CASHIER]],
    'student record made inactive' => [['student' => ['status' => 'inactive']]],
]);

test('the website login still works after the shared login rules were introduced', function () {
    $user = apiAuthStudent();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ])->assertInvalid(['email' => 'Invalid credentials.']);
});
