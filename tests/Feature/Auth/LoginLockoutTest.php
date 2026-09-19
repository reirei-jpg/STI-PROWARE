<?php

use App\Models\AuditLog;
use App\Models\User;

test('a wrong password and an unknown email produce the identical invalid credentials message', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $wrongPassword = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $unknownEmail = $this->post(route('login.store'), [
        'email' => 'nobody-here@example.test',
        'password' => 'whatever',
    ]);

    $wrongPassword->assertInvalid(['email' => 'Invalid credentials.']);
    $unknownEmail->assertInvalid(['email' => 'Invalid credentials.']);
});

test('an account locks itself after 5 failed login attempts', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_CASHIER,
    ]);

    for ($i = 0; $i < 5; $i++) {
        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);
    }

    $user->refresh();

    expect($user->is_active)->toBeFalse();
    expect($user->locked_at)->not->toBeNull();
    expect($user->failed_login_attempts)->toBe(5);

    $log = AuditLog::query()
        ->where('module', 'users')
        ->where('action', 'account_locked')
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->subject_id)->toBe($user->id);
});

test('a locked account cannot log in even with the correct password', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_CASHIER,
        'is_active' => false,
        'locked_at' => now(),
        'failed_login_attempts' => 5,
    ]);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertInvalid(['email' => 'This account has been locked due to too many failed login attempts. Please contact an administrator.']);
    $this->assertGuest();
});

test('a successful login resets the failed attempt counter', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_CASHIER,
        'failed_login_attempts' => 3,
    ]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    expect($user->fresh()->failed_login_attempts)->toBe(0);
});

test('a regular admin cannot reactivate a locked admin account, but the super admin can', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'is_active' => true,
    ]);

    $superAdmin = User::factory()->create([
        'role' => 'super_admin',
        'is_active' => true,
    ]);

    $lockedAdmin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'is_active' => false,
        'locked_at' => now(),
        'failed_login_attempts' => 5,
    ]);

    $this->actingAs($admin)
        ->patch("/admin/users/{$lockedAdmin->id}/activate")
        ->assertSessionHasErrors('user');

    expect($lockedAdmin->fresh()->is_active)->toBeFalse();

    $this->actingAs($superAdmin)
        ->patch("/admin/users/{$lockedAdmin->id}/activate")
        ->assertSessionHas('success');

    $lockedAdmin->refresh();

    expect($lockedAdmin->is_active)->toBeTrue();
    expect($lockedAdmin->locked_at)->toBeNull();
    expect($lockedAdmin->failed_login_attempts)->toBe(0);
});

test('a regular admin can still reactivate a locked non-admin account', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'is_active' => true,
    ]);

    $lockedCashier = User::factory()->create([
        'role' => User::ROLE_CASHIER,
        'is_active' => false,
        'locked_at' => now(),
        'failed_login_attempts' => 5,
    ]);

    $this->actingAs($admin)
        ->patch("/admin/users/{$lockedCashier->id}/activate")
        ->assertSessionHas('success');

    expect($lockedCashier->fresh()->is_active)->toBeTrue();
});
