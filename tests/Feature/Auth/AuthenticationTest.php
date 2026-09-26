<?php

use App\Models\User;
use App\Services\AccountAuthenticator;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Fortify\Features;

test('login screen can be rendered', function () {
    $response = $this->get(route('login'));

    $response->assertOk();
});

test('users can authenticate using the login screen', function () {
    /*
     * A non-student role is used here because student
     * accounts must be linked to an active Student record
     * to authenticate (see FortifyServiceProvider).
     */
    $user = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect('/admin/dashboard');
});

test('users with two factor enabled are redirected to two factor challenge', function () {
    if (! Features::canManageTwoFactorAuthentication()) {
        $this->markTestSkipped('Two-factor authentication is not enabled.');
    }

    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $user = User::factory()->withTwoFactor()->create();

    $response = $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('two-factor.login'));
    $response->assertSessionHas('login.id', $user->id);
    $this->assertGuest();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    $this->assertGuest();
    $response->assertRedirect(route('home'));
});

test('users who try to log in too fast get a readable message instead of an error page', function () {
    $user = User::factory()->create();

    RateLimiter::increment(
        md5('login'.implode('|', [$user->email, '127.0.0.1'])),
        amount: AccountAuthenticator::LOGIN_ATTEMPTS_PER_MINUTE,
    );

    $response = $this->from(route('login'))->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertRedirect(route('login'));
    $response->assertSessionHasErrors('email');
    expect(session('errors')->first('email'))
        ->toStartWith('Too many login attempts. Please try again in ');
    $this->assertGuest();
});
