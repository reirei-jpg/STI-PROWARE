<?php

use App\Models\AuditLog;
use App\Models\User;

function deactivateTestAdmin(): User
{
    return User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'is_active' => true,
    ]);
}

test('an admin can deactivate a specialist account', function () {
    $admin = deactivateTestAdmin();
    $specialist = User::factory()->create([
        'role' => 'specialist',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)
        ->patch("/admin/users/{$specialist->id}/deactivate");

    $response->assertSessionHas('success');

    expect($specialist->fresh()->is_active)->toBeFalse();
});

test('the last active admin account cannot be deactivated', function () {
    $admin = deactivateTestAdmin();

    $response = $this->actingAs($admin)
        ->patch("/admin/users/{$admin->id}/deactivate");

    $response->assertSessionHasErrors('user');

    expect($admin->fresh()->is_active)->toBeTrue();
});

test('an admin can be deactivated when another active admin remains', function () {
    $admin = deactivateTestAdmin();
    $otherAdmin = deactivateTestAdmin();

    $response = $this->actingAs($admin)
        ->patch("/admin/users/{$otherAdmin->id}/deactivate");

    $response->assertSessionHas('success');

    expect($otherAdmin->fresh()->is_active)->toBeFalse();
});

test('a regular admin cannot deactivate the super admin account', function () {
    $admin = deactivateTestAdmin();
    $superAdmin = User::factory()->create([
        'role' => 'super_admin',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)
        ->patch("/admin/users/{$superAdmin->id}/deactivate");

    $response->assertSessionHasErrors('user');

    expect($superAdmin->fresh()->is_active)->toBeTrue();
});

test('an admin cannot deactivate their own account', function () {
    $admin = deactivateTestAdmin();
    deactivateTestAdmin(); // a second active admin, so this isn't blocked by the last-admin guard instead

    $response = $this->actingAs($admin)
        ->patch("/admin/users/{$admin->id}/deactivate");

    $response->assertSessionHasErrors('user');

    expect($admin->fresh()->is_active)->toBeTrue();
});

test('deactivating an already inactive account reports success without a duplicate audit log', function () {
    $admin = deactivateTestAdmin();
    $specialist = User::factory()->create([
        'role' => 'specialist',
        'is_active' => false,
    ]);

    $response = $this->actingAs($admin)
        ->patch("/admin/users/{$specialist->id}/deactivate");

    $response->assertSessionHas('success');

    expect(
        AuditLog::query()
            ->where('subject_id', $specialist->id)
            ->where('action', 'deactivated')
            ->count(),
    )->toBe(0);
});

test('deactivating admins one after another never drops the active count below one', function () {
    $admin = deactivateTestAdmin();
    $targetA = deactivateTestAdmin();
    $targetB = deactivateTestAdmin();

    $this->actingAs($admin)
        ->patch("/admin/users/{$targetA->id}/deactivate")
        ->assertSessionHas('success');

    $this->actingAs($admin)
        ->patch("/admin/users/{$targetB->id}/deactivate")
        ->assertSessionHas('success');

    // Only $admin is left active — the guard must now refuse to
    // deactivate it, the same as the original single-admin case.
    $this->actingAs($admin)
        ->patch("/admin/users/{$admin->id}/deactivate")
        ->assertSessionHasErrors('user');

    $activeAdminCount = User::query()
        ->where('role', User::ROLE_ADMIN)
        ->where('is_active', true)
        ->count();

    expect($activeAdminCount)->toBe(1);
});
