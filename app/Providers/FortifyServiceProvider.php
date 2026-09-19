<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\LoginResponse;
use App\Http\Responses\RegisterResponse;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Failed login attempts allowed before an account is
     * automatically locked, independent of the per-minute
     * rate limiter below (which resets every 60 seconds and
     * can be sidestepped by waiting or switching IP).
     */
    private const MAX_FAILED_LOGIN_ATTEMPTS = 5;

    /**
     * Register application services.
     */
    public function register(): void
    {
        $this->app->singleton(
            LoginResponseContract::class,
            LoginResponse::class,
        );

        $this->app->singleton(
            RegisterResponseContract::class,
            RegisterResponse::class,
        );
    }

    /**
     * Bootstrap application services.
     */
    public function boot(): void
    {
        $this->configureActions();

        $this->configureAuthentication();

        $this->configureViews();

        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify backend actions.
     */
    private function configureActions(): void
    {
        Fortify::createUsersUsing(
            CreateNewUser::class,
        );

        Fortify::resetUserPasswordsUsing(
            ResetUserPassword::class,
        );
    }

    /**
     * Configure PROWARE authentication.
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(
            function (
                Request $request,
            ): ?User {
                $email = Str::lower(
                    trim(
                        (string)
                        $request->input(
                            'email',
                        ),
                    ),
                );

                $password =
                    (string)
                    $request->input(
                        'password',
                    );

                $user = User::query()
                    ->with([
                        'student',
                    ])
                    ->where(
                        'email',
                        $email,
                    )
                    ->first();

                /*
                |--------------------------------------------------------------------------
                | Security Lockout
                |--------------------------------------------------------------------------
                |
                | Blocks the account regardless of whether the
                | password entered this time happens to be correct —
                | a locked account must stay locked until an admin
                | (Super Admin, for Admin-tier accounts) clears it.
                |
                */

                if (
                    $user
                    && $user->isLocked()
                ) {
                    throw ValidationException::withMessages([
                        'email' => 'This account has been locked due to too many failed login attempts. Please contact an administrator.',
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Invalid Credentials
                |--------------------------------------------------------------------------
                |
                | Deliberately identical whether the email doesn't
                | exist at all or the password is simply wrong, so a
                | failed attempt never reveals which one was the
                | problem.
                |
                */

                if (
                    ! $user
                    || ! Hash::check(
                        $password,
                        $user->password,
                    )
                ) {
                    if ($user) {
                        $this->recordFailedLoginAttempt(
                            $user,
                            $request,
                        );
                    }

                    throw ValidationException::withMessages([
                        'email' => 'Invalid credentials.',
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Reset Failed Attempts On Success
                |--------------------------------------------------------------------------
                */

                if ($user->failed_login_attempts > 0) {
                    $user->update([
                        'failed_login_attempts' => 0,
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | General PROWARE Account Status
                |--------------------------------------------------------------------------
                |
                | Applies to:
                |
                | - Admin
                | - Cashier
                | - Specialist
                | - Student
                |
                */

                if (! $user->is_active) {
                    throw ValidationException::withMessages([
                        'email' => 'This PROWARE account has been disabled. Please contact the administrator.',
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Student-Specific Validation
                |--------------------------------------------------------------------------
                */

                if (
                    $user->role === 'student'
                ) {
                    if (! $user->student) {
                        throw ValidationException::withMessages([
                            'email' => 'This student account is not properly linked to a student record. Please contact the PROWARE administrator.',
                        ]);
                    }

                    if (
                        $user
                            ->student
                            ->status
                        !== 'active'
                    ) {
                        throw ValidationException::withMessages([
                            'email' => 'This student account is currently inactive. Please contact the PROWARE administrator.',
                        ]);
                    }
                }

                return $user;
            },
        );
    }

    /**
     * Increments the failed-login counter for an account whose
     * password just didn't match, locking it once the threshold
     * is reached. Unlike the per-minute rate limiter, this floor
     * does not reset every 60 seconds and cannot be sidestepped
     * by waiting or switching IP address.
     */
    private function recordFailedLoginAttempt(
        User $user,
        Request $request,
    ): void {
        $previousAttempts =
            $user->failed_login_attempts;

        $attempts =
            $previousAttempts + 1;

        if ($attempts < self::MAX_FAILED_LOGIN_ATTEMPTS) {
            $user->update([
                'failed_login_attempts' => $attempts,
            ]);

            return;
        }

        $user->update([
            'failed_login_attempts' => $attempts,

            'is_active' => false,

            'locked_at' => now(),
        ]);

        AuditLogger::log(
            request: $request,
            action: 'account_locked',
            module: 'users',
            description: "{$user->name}'s account was automatically locked after {$attempts} failed login attempts.",
            subject: $user,
            oldValues: [
                'is_active' => true,

                'failed_login_attempts' => $previousAttempts,
            ],
            newValues: [
                'is_active' => false,

                'failed_login_attempts' => $attempts,
            ],
        );
    }

    /**
     * Configure Fortify Inertia views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(
            fn (
                Request $request,
            ) => Inertia::render(
                'auth/login',
                [
                    'canResetPassword' => Features::enabled(
                        Features::resetPasswords(),
                    ),

                    'status' => $request
                        ->session()
                        ->get(
                            'status',
                        ),
                ],
            ),
        );

        Fortify::registerView(
            fn () => Inertia::render(
                'auth/register',
            ),
        );

        Fortify::requestPasswordResetLinkView(
            fn (
                Request $request,
            ) => Inertia::render(
                'auth/forgot-password',
                [
                    'status' => $request
                        ->session()
                        ->get(
                            'status',
                        ),
                ],
            ),
        );

        Fortify::resetPasswordView(
            fn (
                Request $request,
            ) => Inertia::render(
                'auth/reset-password',
                [
                    'email' => $request->email,

                    'token' => $request
                        ->route(
                            'token',
                        ),
                ],
            ),
        );
    }

    /**
     * Configure login rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for(
            'login',
            function (
                Request $request,
            ) {
                $email = Str::lower(
                    trim(
                        (string)
                        $request->input(
                            Fortify::username(),
                        ),
                    ),
                );

                $throttleKey =
                    Str::transliterate(
                        $email
                        .'|'
                        .$request->ip(),
                    );

                return Limit::perMinute(
                    5,
                )->by(
                    $throttleKey,
                );
            },
        );
    }
}
