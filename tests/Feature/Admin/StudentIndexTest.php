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

test('the registered-today filter only shows accounts created today', function () {
    $admin = studentIndexAdmin();

    $today = registeredStudent();

    $older = registeredStudent();
    $older->forceFill(['created_at' => now()->subDays(3)])->save();

    $response = $this->actingAs($admin)->get('/admin/students?status=registered_today');

    $response->assertInertia(fn ($page) => $page
        ->has('students.data', 1)
        ->where('students.data.0.name', $today->name)
        ->where('summary.registered_today', 1),
    );
});

test('a student locked out by failed logins is flagged as locked, not just inactive', function () {
    $admin = studentIndexAdmin();

    registeredStudent([
        'name' => 'Locked Student',
        'is_active' => false,
        'failed_login_attempts' => 5,
        'locked_at' => now(),
    ]);
    registeredStudent(['name' => 'Deactivated Student', 'is_active' => false]);

    $this->actingAs($admin)
        ->get('/admin/students?search=Locked')
        ->assertInertia(fn ($page) => $page
            ->has('students.data', 1)
            ->where('students.data.0.is_locked', true),
        );

    $this->actingAs($admin)
        ->get('/admin/students?search=Deactivated')
        ->assertInertia(fn ($page) => $page
            ->has('students.data', 1)
            ->where('students.data.0.is_locked', false),
        );
});

test('an admin can unlock a locked-out student from the students page, and the student can log in again', function () {
    $admin = studentIndexAdmin();
    $student = registeredStudent([
        'is_active' => false,
        'failed_login_attempts' => 5,
        'locked_at' => now(),
    ]);

    $this->post('/login', ['email' => $student->email, 'password' => 'password'])
        ->assertSessionHasErrors('email');
    $this->assertGuest();

    $this->actingAs($admin)
        ->patch("/admin/users/{$student->id}/activate")
        ->assertRedirect();

    $student = $student->fresh();
    expect($student->is_active)->toBeTrue()
        ->and($student->locked_at)->toBeNull()
        ->and($student->failed_login_attempts)->toBe(0);

    auth()->logout();

    $this->post('/login', ['email' => $student->email, 'password' => 'password']);
    $this->assertAuthenticatedAs($student);
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
