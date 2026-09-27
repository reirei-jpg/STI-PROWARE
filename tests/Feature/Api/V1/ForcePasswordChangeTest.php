<?php

use App\Models\Student;
use App\Models\User;

function makeTemporaryPasswordStudent(): User
{
    $user = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
        'must_change_password' => true,
    ]);

    Student::query()->create([
        'user_id' => $user->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    return $user->fresh('student');
}

test('a student with a temporary password is refused every endpoint except me, logout, and password', function () {
    $student = makeTemporaryPasswordStudent();
    $token = $student->createToken('Phone')->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/v1/catalog')
        ->assertStatus(423)
        ->assertJsonPath('must_change_password', true);

    $this->withToken($token)
        ->getJson('/api/v1/orders')
        ->assertStatus(423);

    $this->withToken($token)
        ->getJson('/api/v1/auth/me')
        ->assertOk();
});

test('a student with a temporary password can change it and immediately use the rest of the API', function () {
    $student = makeTemporaryPasswordStudent();
    $token = $student->createToken('Phone')->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/v1/catalog')
        ->assertStatus(423);

    $this->withToken($token)
        ->putJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])
        ->assertOk();

    expect($student->fresh()->must_change_password)->toBeFalse();

    $this->withToken($token)
        ->getJson('/api/v1/catalog')
        ->assertOk();
});

test('a student with a permanent password is not affected by this restriction', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
        'must_change_password' => false,
    ]);

    Student::query()->create([
        'user_id' => $student->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    $this->withToken($student->createToken('Phone')->plainTextToken)
        ->getJson('/api/v1/catalog')
        ->assertOk();
});
