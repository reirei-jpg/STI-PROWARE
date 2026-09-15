<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForcePasswordChange
{
    /**
     * Prevent users with temporary passwords
     * from accessing protected PROWARE pages.
     */
    public function handle(
        Request $request,
        Closure $next,
    ): Response {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Not Authenticated
        |--------------------------------------------------------------------------
        |
        | Authentication middleware will handle this.
        |
        */

        if (! $user) {
            return $next(
                $request,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Password Already Changed
        |--------------------------------------------------------------------------
        */

        if (
            ! $user
                ->must_change_password
        ) {
            return $next(
                $request,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Allowed Routes
        |--------------------------------------------------------------------------
        |
        | A user who must change their password still needs access to:
        |
        | - the password-change screen
        | - the password-change submission
        | - logout
        |
        */

        if (
            $request->routeIs(
                'password.change-required',
            )
            || $request->routeIs(
                'password.change-required.update',
            )
            || $request->routeIs(
                'logout',
            )
        ) {
            return $next(
                $request,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Force Password Change
        |--------------------------------------------------------------------------
        */

        return redirect()->route(
            'password.change-required',
        );
    }
}
