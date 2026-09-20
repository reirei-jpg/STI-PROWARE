<?php

use App\Actions\Fortify\ResetUserPassword;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

function apiPasswordPayload(array $overrides = []): array
{
    return array_merge([
        'current_password' => 'password',
        'password' => 'new-password-123',
        'password_confirmation' => 'new-password-123',
    ], $overrides);
}

/**
 * Two phones signed in to the same student: [user, phone token, tablet token].
 *
 * @return array{0: User, 1: string, 2: string}
 */
function apiPasswordTwoPhones(): array
{
    $student = makeStudentAccount();

    return [
        $student,
        $student->createToken('Phone')->plainTextToken,
        $student->createToken('Tablet')->plainTextToken,
    ];
}

test('changing the password needs a signed-in student', function () {
    $this->putJson('/api/v1/auth/password', apiPasswordPayload())->assertUnauthorized();

    $cashier = User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]);

    $this->withToken($cashier->createToken('Phone')->plainTextToken)
        ->putJson('/api/v1/auth/password', apiPasswordPayload())
        ->assertUnauthorized();
});

test('a student can change their password and the change is audited', function () {
    [$student, $phone] = apiPasswordTwoPhones();

    $this->withToken($phone)
        ->putJson('/api/v1/auth/password', apiPasswordPayload())
        ->assertOk()
        ->assertJsonPath('message', 'Password updated.');

    expect(Hash::check('new-password-123', $student->fresh()->password))->toBeTrue();

    $log = AuditLog::query()
        ->where('module', 'users')
        ->where('action', 'password_changed')
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->subject_id)->toBe($student->id)
        ->and($log->user_id)->toBe($student->id);
});

test('the new password works for signing in and the old one no longer does', function () {
    [$student, $phone] = apiPasswordTwoPhones();

    $this->withToken($phone)
        ->putJson('/api/v1/auth/password', apiPasswordPayload())
        ->assertOk();

    $this->app['auth']->forgetGuards();

    $this->postJson('/api/v1/auth/login', [
        'email' => $student->email,
        'password' => 'new-password-123',
        'device_name' => 'Pixel 8',
    ])->assertOk();
});

test('the phone that changed the password stays signed in and the other phones are signed out', function () {
    [$student, $phone, $tablet] = apiPasswordTwoPhones();

    $this->withToken($phone)
        ->putJson('/api/v1/auth/password', apiPasswordPayload())
        ->assertOk();

    expect($student->tokens()->pluck('name')->all())->toBe(['Phone']);

    $this->app['auth']->forgetGuards();
    $this->withToken($phone)->getJson('/api/v1/auth/me')->assertOk();

    $this->app['auth']->forgetGuards();
    $this->withToken($tablet)->getJson('/api/v1/auth/me')->assertUnauthorized();
});

test('a wrong current password is refused with the website message and nothing changes', function () {
    [$student, $phone, $tablet] = apiPasswordTwoPhones();

    $this->withToken($phone)
        ->putJson('/api/v1/auth/password', apiPasswordPayload(['current_password' => 'not-my-password']))
        ->assertUnprocessable()
        ->assertJsonPath('errors.current_password.0', 'The password is incorrect.');

    expect(Hash::check('password', $student->fresh()->password))->toBeTrue()
        ->and($student->tokens()->count())->toBe(2);
});

test('the new password must match its confirmation and meet the website rules', function () {
    [$student, $phone] = apiPasswordTwoPhones();

    $this->withToken($phone)
        ->putJson('/api/v1/auth/password', apiPasswordPayload(['password_confirmation' => 'something-else']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    $this->withToken($phone)
        ->putJson('/api/v1/auth/password', apiPasswordPayload([
            'password' => 'short',
            'password_confirmation' => 'short',
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    $this->withToken($phone)
        ->putJson('/api/v1/auth/password', ['current_password' => 'password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    expect(Hash::check('password', $student->fresh()->password))->toBeTrue();
});

test('changing the password is rate limited so a stolen token cannot guess the old one', function () {
    [, $phone] = apiPasswordTwoPhones();

    foreach (range(1, 6) as $attempt) {
        $this->withToken($phone)
            ->putJson('/api/v1/auth/password', apiPasswordPayload(['current_password' => "wrong-{$attempt}"]))
            ->assertUnprocessable();
    }

    $this->withToken($phone)
        ->putJson('/api/v1/auth/password', apiPasswordPayload())
        ->assertStatus(429);
});

test('changing the password on the website signs every phone out', function () {
    [$student] = apiPasswordTwoPhones();

    $this->actingAs($student)
        ->put(route('user-password.update'), apiPasswordPayload())
        ->assertSessionHasNoErrors();

    expect($student->tokens()->count())->toBe(0);
});

test('resetting a forgotten password signs every phone out', function () {
    [$student] = apiPasswordTwoPhones();

    app(ResetUserPassword::class)->reset($student, [
        'password' => 'reset-password-123',
        'password_confirmation' => 'reset-password-123',
    ]);

    expect($student->tokens()->count())->toBe(0)
        ->and(Hash::check('reset-password-123', $student->fresh()->password))->toBeTrue();
});

test('the new password must be different from the current one', function () {
    [$student, $phone] = apiPasswordTwoPhones();

    $this->withToken($phone)
        ->putJson('/api/v1/auth/password', apiPasswordPayload([
            'password' => 'password',
            'password_confirmation' => 'password',
        ]))
        ->assertUnprocessable()
        ->assertJsonPath('errors.password.0', 'Your new password must be different from your current password.');

    expect(Hash::check('password', $student->fresh()->password))->toBeTrue()
        ->and($student->tokens()->count())->toBe(2);
});
