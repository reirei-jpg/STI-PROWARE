<?php

use App\Models\Position;
use App\Models\Staff;
use App\Models\User;

function hierarchyTestAdmin(): User
{
    return User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'is_active' => true,
    ]);
}

function hierarchyTestStaffUser(string $role): User
{
    $user = User::factory()->create([
        'role' => $role,
        'is_active' => true,
    ]);

    $position = Position::query()->create([
        'name' => 'Test Position '.uniqid(),
        'role' => $role,
        'level' => 1,
        'is_supervisory' => false,
        'is_active' => true,
    ]);

    Staff::query()->create([
        'user_id' => $user->id,
        'employee_id' => 'EMP-'.uniqid(),
        'position' => $position->name,
        'position_id' => $position->id,
    ]);

    return $user;
}

test('a regular admin cannot view the edit form for a super admin account', function () {
    $admin = hierarchyTestAdmin();
    $superAdmin = hierarchyTestStaffUser('super_admin');

    $this->actingAs($admin)
        ->get("/admin/users/{$superAdmin->id}/edit")
        ->assertForbidden();
});

test('a regular admin cannot submit an update for a super admin account', function () {
    $admin = hierarchyTestAdmin();
    $superAdmin = hierarchyTestStaffUser('super_admin');

    $this->actingAs($admin)
        ->put("/admin/users/{$superAdmin->id}", [
            'name' => 'Hacked Name',
            'employee_id' => $superAdmin->staff->employee_id,
            'email' => $superAdmin->email,
            'role' => 'super_admin',
            'position_id' => $superAdmin->staff->position_id,
        ])
        ->assertForbidden();

    expect($superAdmin->fresh()->name)->not->toBe('Hacked Name');
});

test('a regular admin still cannot edit another admin account', function () {
    $admin = hierarchyTestAdmin();
    $otherAdmin = hierarchyTestStaffUser('admin');

    $this->actingAs($admin)
        ->get("/admin/users/{$otherAdmin->id}/edit")
        ->assertForbidden();
});

test('a super admin can view the edit form for another admin account', function () {
    $superAdmin = hierarchyTestAdmin();
    $superAdmin->update(['role' => 'super_admin']);

    $targetAdmin = hierarchyTestStaffUser('admin');

    $this->actingAs($superAdmin)
        ->get("/admin/users/{$targetAdmin->id}/edit")
        ->assertOk();
});
