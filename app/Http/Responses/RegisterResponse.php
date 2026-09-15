<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Symfony\Component\HttpFoundation\Response;

class RegisterResponse implements RegisterResponseContract
{
    /**
     * Redirect the newly registered account
     * according to its assigned role.
     */
    public function toResponse($request): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect('/login');
        }

        $redirectPath = match ($user->role) {
            'admin' => '/admin/dashboard',
            'student' => '/student/dashboard',
            'specialist' => '/specialist/dashboard',
            'cashier' => '/cashier/dashboard',
            default => '/',
        };

        return redirect()->intended($redirectPath);
    }
}
