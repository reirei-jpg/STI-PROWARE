<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\LoginResponse;
use App\Http\Responses\RegisterResponse;
use App\Models\User;
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
                | Invalid Credentials
                |--------------------------------------------------------------------------
                */

                if (
                    ! $user
                    || ! Hash::check(
                        $password,
                        $user->password,
                    )
                ) {
                    return null;
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
