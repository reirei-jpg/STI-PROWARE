<?php

use App\Models\Student;
use App\Models\User;

function validRegistrationPayload(array $overrides = []): array
{
    return array_merge([
        'student_id' => '02000123456',
        'full_name' => 'Juan Dela Cruz',
        'last_name' => 'Dela Cruz',
        'course' => 'BSIT',
        'year_level' => '1',
        'email' => 'delacruz.123456@sti.edu.ph',
        'password' => 'Password1!',
        'password_confirmation' => 'Password1!',
        'terms' => true,
    ], $overrides);
}

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('a student can self-register without any pre-approved roster entry', function () {
    $response = $this->post(
        route('register.store'),
        validRegistrationPayload(),
    );

    $this->assertAuthenticated();

    $user = User::where('email', 'delacruz.123456@sti.edu.ph')->first();

    expect($user)->not->toBeNull();
    expect($user->name)->toBe('Juan Dela Cruz');
    expect($user->role)->toBe('student');
    expect($user->is_active)->toBeTrue();

    expect($user->student)->not->toBeNull();
    expect($user->student->student_id)->toBe('02000123456');
    expect($user->student->course)->toBe('BSIT');
    expect($user->student->year_level)->toBe('1');
    expect($user->student->status)->toBe('active');

    $response->assertRedirect('/student/dashboard');
});

test('the same student ID cannot be registered twice', function () {
    $this->post(route('register.store'), validRegistrationPayload());

    auth()->logout();

    $response = $this->post(
        route('register.store'),
        validRegistrationPayload([
            'email' => 'delacruz.123456@sti.edu.ph',
        ]),
    );

    $response->assertSessionHasErrors('student_id');

    expect(User::where('email', 'delacruz.123456@sti.edu.ph')->count())->toBe(1);
});

test('the submitted email must match the auto-generated school email pattern', function () {
    $response = $this->post(
        route('register.store'),
        validRegistrationPayload([
            'email' => 'someone.else@sti.edu.ph',
        ]),
    );

    $response->assertSessionHasErrors('email');

    expect(User::where('name', 'Juan Dela Cruz')->exists())->toBeFalse();
});

test('full name, course, and year level are required', function () {
    $response = $this->post(
        route('register.store'),
        validRegistrationPayload([
            'full_name' => '',
            'course' => '',
            'year_level' => '',
        ]),
    );

    $response->assertSessionHasErrors(['full_name', 'course', 'year_level']);
});

test('the year level must be numeric', function () {
    $response = $this->post(
        route('register.store'),
        validRegistrationPayload([
            'year_level' => 'first year',
        ]),
    );

    $response->assertSessionHasErrors('year_level');

    expect(User::where('name', 'Juan Dela Cruz')->exists())->toBeFalse();
});

test('registering does not require any StudentRegistry data to exist', function () {
    expect(Student::query()->count())->toBe(0);

    $this->post(route('register.store'), validRegistrationPayload());

    expect(Student::query()->count())->toBe(1);
});

test('the password must be at least 8 characters with a letter, a number, and a symbol', function () {
    $tooShort = $this->post(
        route('register.store'),
        validRegistrationPayload([
            'password' => 'Ab1!',
            'password_confirmation' => 'Ab1!',
        ]),
    );

    $tooShort->assertSessionHasErrors('password');

    $noSymbol = $this->post(
        route('register.store'),
        validRegistrationPayload([
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ]),
    );

    $noSymbol->assertSessionHasErrors('password');

    $noNumber = $this->post(
        route('register.store'),
        validRegistrationPayload([
            'password' => 'Password!',
            'password_confirmation' => 'Password!',
        ]),
    );

    $noNumber->assertSessionHasErrors('password');

    expect(User::query()->count())->toBe(0);
});

test('a successful registration leaves a welcome flash message for the dashboard', function () {
    $response = $this->post(route('register.store'), validRegistrationPayload());

    $response->assertSessionHas(
        'success',
        fn (string $message) => str_contains($message, 'Juan Dela Cruz'),
    );
});
