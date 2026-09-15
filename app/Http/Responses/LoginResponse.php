<?php

namespace App\Http\Responses;

use App\Models\User;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class LoginResponse implements LoginResponseContract
{
    /**
     * Redirect a successfully authenticated PROWARE user
     * directly to the dashboard assigned to their role.
     */
    public function toResponse(
        $request,
    ): Response {
        $user =
            $request->user();

        if (! $user) {
            return redirect(
                '/login',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | PROWARE Role-Based Redirect
        |--------------------------------------------------------------------------
        |
        | We intentionally do NOT use redirect()->intended().
        |
        | Every successful login should go directly to the dashboard
        | assigned to the authenticated user's current role.
        |
        */

        $redirectPath =
            match ($user->role) {
                User::ROLE_SUPER_ADMIN,
                User::ROLE_ADMIN => '/admin/dashboard',

                User::ROLE_SPECIALIST => '/specialist/dashboard',

                User::ROLE_CASHIER => '/cashier/dashboard',

                User::ROLE_STUDENT => '/student/dashboard',

                default => '/',
            };

        return redirect(
            $redirectPath,
        );
    }
}
