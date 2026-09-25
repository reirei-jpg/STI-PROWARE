<?php

use App\Models\Student;
use App\Models\User;

function studentIndexAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function registeredStudent(array $overrides = []): User
{
    $user = User::factory()->create(array_merge([
        'role' => 'student',
        'is_active' => true,
    ], $overrides));

    Student::query()->create([
        'user_id' => $user->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    return $user->fresh('student');
}

test('a non-admin cannot view the students page', function () {
    $student = registeredStudent();

    $response = $this->actingAs($student)->get('/admin/students');

    $response->assertForbidden();
});

test('an admin can view the list of registered students', function () {
    $admin = studentIndexAdmin();
    $student = registeredStudent(['name' => 'Juan Dela Cruz']);

    $response = $this->actingAs($admin)->get('/admin/students');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Students/Index')
        ->where('summary.total', 1)
        ->where('students.data.0.name', 'Juan Dela Cruz')
        ->where('students.data.0.student_id', $student->student->student_id),
    );
});

test('staff accounts do not show up in the students list', function () {
    $admin = studentIndexAdmin();

    User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);

    registeredStudent();

    $response = $this->actingAs($admin)->get('/admin/students');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('summary.total', 1),
    );
});

test('the search filter matches by name, email, or student ID', function () {
    $admin = studentIndexAdmin();

    $match = registeredStudent(['name' => 'Maria Santos']);
    registeredStudent(['name' => 'Someone Else']);

    $response = $this->actingAs($admin)->get('/admin/students?search=Maria');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('students.data', 1)
        ->where('students.data.0.name', $match->name),
    );

    $byId = $this->actingAs($admin)->get(
        '/admin/students?search='.$match->student->student_id,
    );

    $byId->assertInertia(fn ($page) => $page
        ->has('students.data', 1),
    );
});

test('the status filter narrows to active or inactive accounts', function () {
    $admin = studentIndexAdmin();

    registeredStudent(['is_active' => true]);
    registeredStudent(['is_active' => false]);

    $activeOnly = $this->actingAs($admin)->get('/admin/students?status=active');

    $activeOnly->assertInertia(fn ($page) => $page
        ->has('students.data', 1)
        ->where('students.data.0.is_active', true),
    );

    $inactiveOnly = $this->actingAs($admin)->get('/admin/students?status=inactive');

    $inactiveOnly->assertInertia(fn ($page) => $page
        ->has('students.data', 1)
        ->where('students.data.0.is_active', false),
    );
});

test('an admin can deactivate and reactivate a registered student through the existing generic endpoint', function () {
    $admin = studentIndexAdmin();
    $student = registeredStudent();

    $this->actingAs($admin)
        ->patch("/admin/users/{$student->id}/deactivate")
        ->assertRedirect();

    expect($student->fresh()->is_active)->toBeFalse();

    $this->actingAs($admin)
        ->patch("/admin/users/{$student->id}/activate")
        ->assertRedirect();

    expect($student->fresh()->is_active)->toBeTrue();
});
