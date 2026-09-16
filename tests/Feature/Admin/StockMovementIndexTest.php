<?php

use App\Models\User;

test('a super admin can view stock movement history', function () {
    $superAdmin = User::factory()->create([
        'role' => 'super_admin',
        'is_active' => true,
    ]);

    $response = $this->actingAs($superAdmin)->get('/staff/inventory/movements');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('staff/Inventory/Movements'),
    );
});

test('a student cannot view stock movement history', function () {
    $studentUser = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    $response = $this->actingAs($studentUser)->get('/staff/inventory/movements');

    $response->assertForbidden();
});
