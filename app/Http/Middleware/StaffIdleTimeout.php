<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class StaffIdleTimeout
{
    /**
     * 30 minutes in seconds.
     */
    private const TIMEOUT_SECONDS = 1800;

    public function handle(
        Request $request,
        Closure $next,
    ): Response {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Guests
        |--------------------------------------------------------------------------
        */

        if ($user === null) {
            return $next($request);
        }

        /*
        |--------------------------------------------------------------------------
        | Staff Roles Only
        |--------------------------------------------------------------------------
        */

        $staffRoles = [
            User::ROLE_SUPER_ADMIN,
            User::ROLE_ADMIN,
            User::ROLE_SPECIALIST,
            User::ROLE_CASHIER,
        ];

        if (
            ! in_array(
                $user->role,
                $staffRoles,
                true,
            )
        ) {
            return $next($request);
        }

        /*
        |--------------------------------------------------------------------------
        | Session Activity
        |--------------------------------------------------------------------------
        */

        $session =
            $request->session();

        $lastActivity =
            $session->get(
                'staff_last_activity',
            );

        $now =
            now()->timestamp;

        /*
        |--------------------------------------------------------------------------
        | Expire After 30 Minutes
        |--------------------------------------------------------------------------
        */

        if (
            $lastActivity !== null
            &&
            (
                $now
                -
                (int) $lastActivity
            )
            >= self::TIMEOUT_SECONDS
        ) {
            Auth::logout();

            $session->invalidate();

            $session->regenerateToken();

            return redirect()
                ->to(
                    '/login',
                )
                ->with(
                    'status',
                    'Your session expired after 30 minutes of inactivity. Please log in again.',
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Refresh Activity Timestamp
        |--------------------------------------------------------------------------
        */

        $session->put(
            'staff_last_activity',
            $now,
        );

        return $next($request);
    }
}
