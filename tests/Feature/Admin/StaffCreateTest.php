<?php

use App\Models\Position;
use App\Models\User;

function staffCreateAdmin(bool $superAdmin = false): User
{
    return User::factory()->create([
        'role' => $superAdmin ? 'super_admin' : User::ROLE_ADMIN,
        'is_active' => true,
    ]);
}

function staffCreatePosition(string $role, array $overrides = []): Position
{
    return Position::query()->create(array_merge([
        'name' => 'Test Position '.uniqid(),
        'role' => $role,
        'level' => 1,
        'is_supervisory' => false,
        'is_active' => true,
    ], $overrides));
}

function validStaffPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Juan Dela Cruz',
        'employee_id' => 'EMP-0001',
        'role' => 'cashier',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
    ], $overrides);
}

test('a non-admin cannot view the create-staff page', function () {
    $cashier = User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);

    $this->actingAs($cashier)
        ->get('/admin/users/create')
        ->assertForbidden();
});

test('an admin can create a staff account with an email generated from the name and employee ID', function () {
    $admin = staffCreateAdmin();
    $position = staffCreatePosition('cashier');

    $response = $this->actingAs($admin)->post('/admin/users', validStaffPayload([
        'position_id' => $position->id,
    ]));

    $response->assertRedirect('/admin/users');
    $response->assertSessionHas('success');

    $user = User::where('name', 'Juan Dela Cruz')->first();

    expect($user)->not->toBeNull();
    expect($user->email)->toBe('juan.dela.cruz.emp0001@proware.sti.edu.ph');
    expect($user->role)->toBe('cashier');
    expect($user->is_active)->toBeTrue();
    expect($user->must_change_password)->toBeTrue();

    expect($user->staff)->not->toBeNull();
    expect($user->staff->employee_id)->toBe('EMP-0001');
    expect($user->staff->position_id)->toBe($position->id);
});

test('submitting an email field is ignored — it is always derived from the name and employee ID', function () {
    $admin = staffCreateAdmin();
    $position = staffCreatePosition('cashier');

    $this->actingAs($admin)->post('/admin/users', validStaffPayload([
        'position_id' => $position->id,
        'email' => 'someone-else@spoofed.com',
    ]));

    $user = User::where('name', 'Juan Dela Cruz')->first();

    expect($user)->not->toBeNull();
    expect($user->email)->toBe('juan.dela.cruz.emp0001@proware.sti.edu.ph');
});

test('the admin cannot create a duplicate employee ID', function () {
    $admin = staffCreateAdmin();
    $position = staffCreatePosition('cashier');

    $this->actingAs($admin)->post('/admin/users', validStaffPayload([
        'position_id' => $position->id,
    ]));

    $response = $this->actingAs($admin)->post('/admin/users', validStaffPayload([
        'position_id' => $position->id,
        'name' => 'Someone Else',
    ]));

    $response->assertSessionHasErrors('employee_id');

    expect(User::where('role', 'cashier')->count())->toBe(1);
});

test('the staff password must meet the shared password policy', function () {
    $admin = staffCreateAdmin();
    $position = staffCreatePosition('cashier');

    $response = $this->actingAs($admin)->post('/admin/users', validStaffPayload([
        'position_id' => $position->id,
        'password' => 'weak',
        'password_confirmation' => 'weak',
    ]));

    $response->assertSessionHasErrors('password');

    expect(User::where('name', 'Juan Dela Cruz')->exists())->toBeFalse();
});

test('the employee ID cannot be longer than 15 characters', function () {
    $admin = staffCreateAdmin();
    $position = staffCreatePosition('cashier');

    $response = $this->actingAs($admin)->post('/admin/users', validStaffPayload([
        'position_id' => $position->id,
        'employee_id' => 'EMP-12121212121211',
    ]));

    $response->assertSessionHasErrors('employee_id');

    expect(User::where('name', 'Juan Dela Cruz')->exists())->toBeFalse();
});

test('a regular admin cannot create another admin account', function () {
    $admin = staffCreateAdmin();
    $position = staffCreatePosition('admin');

    $response = $this->actingAs($admin)->post('/admin/users', validStaffPayload([
        'role' => 'admin',
        'position_id' => $position->id,
    ]));

    $response->assertSessionHasErrors('role');

    expect(User::where('name', 'Juan Dela Cruz')->exists())->toBeFalse();
});

test('a super admin can create another admin account', function () {
    $superAdmin = staffCreateAdmin(superAdmin: true);
    $position = staffCreatePosition('admin');

    $response = $this->actingAs($superAdmin)->post('/admin/users', validStaffPayload([
        'role' => 'admin',
        'position_id' => $position->id,
    ]));

    $response->assertSessionHas('success');

    $user = User::where('name', 'Juan Dela Cruz')->first();

    expect($user)->not->toBeNull();
    expect($user->role)->toBe('admin');
});

test('the selected position must belong to the selected role', function () {
    $admin = staffCreateAdmin();
    $specialistPosition = staffCreatePosition('specialist');

    $response = $this->actingAs($admin)->post('/admin/users', validStaffPayload([
        'role' => 'cashier',
        'position_id' => $specialistPosition->id,
    ]));

    $response->assertStatus(422);

    expect(User::where('name', 'Juan Dela Cruz')->exists())->toBeFalse();
});
