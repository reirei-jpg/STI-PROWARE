<?php

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

test('a self-service password change writes an audit log entry', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertSessionHasNoErrors();

    $log = AuditLog::query()
        ->where('module', 'users')
        ->where('action', 'password_changed')
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->user_id)->toBe($user->id);
    expect($log->subject_id)->toBe($user->id);
});

test('the forced first-login password change writes an audit log entry', function () {
    $user = User::factory()->create([
        'must_change_password' => true,
    ]);

    $this->actingAs($user)
        ->patch('/password/change-required', [
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])
        ->assertSessionHasNoErrors();

    $log = AuditLog::query()
        ->where('module', 'users')
        ->where('action', 'password_changed')
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->subject_id)->toBe($user->id);
    expect($log->old_values['must_change_password'])->toBeTrue();
    expect($log->new_values['must_change_password'])->toBeFalse();
});

test('a forgot-password reset writes an audit log entry correctly attributed to the account owner', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post(route('password.email'), ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
        $this->post(route('password.update'), [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'reset-password',
            'password_confirmation' => 'reset-password',
        ])->assertSessionHasNoErrors();

        return true;
    });

    $log = AuditLog::query()
        ->where('module', 'users')
        ->where('action', 'password_changed')
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull();
    // The user isn't authenticated during a forgot-password reset,
    // so the actor must come from the explicit override, not the request.
    expect($log->user_id)->toBe($user->id);
    expect($log->actor_name)->toBe($user->name);
    expect($log->subject_id)->toBe($user->id);
});
