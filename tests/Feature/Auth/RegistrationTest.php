<?php

use App\Models\StudentRegistry;
use App\Models\User;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    /*
     * Registration is gated by a pre-seeded school roster
     * (see App\Actions\Fortify\CreateNewUser): the student ID,
     * last name, and email must all match an available
     * StudentRegistry record before an account is created.
     */
    $registry = StudentRegistry::query()->create([
        'student_id' => '02000123456',
        'full_name' => 'Juan Dela Cruz',
        'last_name' => 'Dela Cruz',
        'email' => 'delacruz.123456@sti.edu.ph',
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    $response = $this->post(route('register.store'), [
        'student_id' => '02000123456',
        'last_name' => 'Dela Cruz',
        'email' => 'delacruz.123456@sti.edu.ph',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => true,
    ]);

    $this->assertAuthenticated();

    $user = User::where('email', 'delacruz.123456@sti.edu.ph')->first();

    expect($user)->not->toBeNull();
    expect($user->role)->toBe('student');
    expect($user->student)->not->toBeNull();

    $response->assertRedirect('/student/dashboard');

    $registry->refresh();
    expect($registry->claimed_by_user_id)->toBe($user->id);
});
