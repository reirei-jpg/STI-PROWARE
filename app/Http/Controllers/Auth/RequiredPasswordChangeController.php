<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class RequiredPasswordChangeController extends Controller
{
    /**
     * Show the forced password-change page.
     */
    public function edit(
        Request $request,
    ): Response|RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user,
            401,
        );

        /*
         * If the password has already been changed,
         * there is no reason to show this screen.
         */
        if (
            ! $user
                ->must_change_password
        ) {
            return redirect(
                $this->dashboardUrl(
                    $user->role,
                ),
            );
        }

        return Inertia::render(
            'auth/change-temporary-password',
            [
                'user' => [
                    'name' => $user->name,

                    'email' => $user->email,

                    'role' => $user->role,
                ],
            ],
        );
    }

    /**
     * Save the staff member's permanent password.
     */
    public function update(
        Request $request,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user,
            401,
        );

        $validated =
            $request->validate(
                [
                    'password' => [
                        'required',
                        'string',
                        Password::defaults(),
                        'confirmed',
                    ],
                ],
                [
                    'password.required' => 'Please enter your new password.',

                    'password.confirmed' => 'The password confirmation does not match.',
                ],
            );

        /*
        |--------------------------------------------------------------------------
        | Prevent Reusing Temporary Password
        |--------------------------------------------------------------------------
        */

        if (
            Hash::check(
                $validated['password'],
                $user->password,
            )
        ) {
            return back()->withErrors([
                'password' => 'Your new password must be different from the temporary password.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Save Permanent Password
        |--------------------------------------------------------------------------
        */

        $user->update([
            'password' => $validated['password'],

            'must_change_password' => false,
        ]);

        AuditLogger::log(
            request: $request,
            action: 'password_changed',
            module: 'users',
            description: "{$user->name} set their permanent password after first login.",
            subject: $user,
            oldValues: [
                'must_change_password' => true,
            ],
            newValues: [
                'must_change_password' => false,
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Regenerate Session
        |--------------------------------------------------------------------------
        */

        $request
            ->session()
            ->regenerate();

        return redirect(
            $this->dashboardUrl(
                $user->role,
            ),
        )->with(
            'success',
            'Your password has been changed successfully.',
        );
    }

    /**
     * Determine the correct dashboard for the user role.
     */
    private function dashboardUrl(
        string $role,
    ): string {
        return match ($role) {
            'admin' => '/admin/dashboard',

            'cashier' => '/cashier/dashboard',

            'specialist' => '/specialist/dashboard',

            'student' => '/student/dashboard',

            default => '/',
        };
    }
}
