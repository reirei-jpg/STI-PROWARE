<?php

use App\Models\Student;
use App\Models\User;

function studentCreateAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function validAdminStudentPayload(array $overrides = []): array
{
    return array_merge([
        'student_id' => '02000123456',
        'full_name' => 'Juan Dela Cruz',
        'last_name' => 'Dela Cruz',
        'course' => 'BSIT',
        'year_level' => '1',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
    ], $overrides);
}

test('a non-admin cannot view the create-student page', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    $this->actingAs($student)
        ->get('/admin/students/create')
        ->assertForbidden();
});

test('an admin can create a student account directly', function () {
    $admin = studentCreateAdmin();

    $response = $this->actingAs($admin)->post(
        '/admin/students',
        validAdminStudentPayload(),
    );

    $response->assertRedirect('/admin/students');
    $response->assertSessionHas('success');

    $user = User::where('email', 'delacruz.123456@sti.edu.ph')->first();

    expect($user)->not->toBeNull();
    expect($user->name)->toBe('Juan Dela Cruz');
    expect($user->role)->toBe('student');
    expect($user->is_active)->toBeTrue();

    /*
     * Unlike self-registration, an admin-created account must force
     * a password change on first login — the admin set a temporary
     * password, not the student themselves.
     */
    expect($user->must_change_password)->toBeTrue();

    expect($user->student)->not->toBeNull();
    expect($user->student->student_id)->toBe('02000123456');
    expect($user->student->course)->toBe('BSIT');
    expect($user->student->year_level)->toBe('1');
});

test('the admin is not logged in as the student they just created', function () {
    $admin = studentCreateAdmin();

    $this->actingAs($admin)->post('/admin/students', validAdminStudentPayload());

    expect(auth()->user()->id)->toBe($admin->id);
});

test('the admin cannot create a duplicate student ID', function () {
    $admin = studentCreateAdmin();

    $this->actingAs($admin)->post('/admin/students', validAdminStudentPayload());

    $response = $this->actingAs($admin)->post(
        '/admin/students',
        validAdminStudentPayload([
            'full_name' => 'Someone Else',
        ]),
    );

    $response->assertSessionHasErrors('student_id');

    expect(User::where('role', 'student')->count())->toBe(1);
});

test('the admin-created password must meet the same policy as self-registration', function () {
    $admin = studentCreateAdmin();

    $response = $this->actingAs($admin)->post(
        '/admin/students',
        validAdminStudentPayload([
            'password' => 'weak',
            'password_confirmation' => 'weak',
        ]),
    );

    $response->assertSessionHasErrors('password');

    expect(Student::query()->count())->toBe(0);
});

test('required fields are enforced when the admin creates a student', function () {
    $admin = studentCreateAdmin();

    $response = $this->actingAs($admin)->post('/admin/students', [
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
    ]);

    $response->assertSessionHasErrors([
        'student_id',
        'full_name',
        'last_name',
        'course',
        'year_level',
    ]);
});
