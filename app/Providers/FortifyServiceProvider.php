<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\LoginResponse;
use App\Http\Responses\RegisterResponse;
use App\Models\User;
use App\Services\AccountAuthenticator;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
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
     *
     * The rules live in AccountAuthenticator so the website and the
     * mobile app API share exactly the same checks and messages.
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(
            fn (Request $request): ?User => app(AccountAuthenticator::class)
                ->authenticate(
                    (string) $request->input('email'),
                    (string) $request->input('password'),
                    $request,
                ),
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
                    AccountAuthenticator::LOGIN_ATTEMPTS_PER_MINUTE,
                )->by(
                    $throttleKey,
                )->response(
                    function (Request $request, array $headers) {
                        $seconds = (int) ($headers['Retry-After'] ?? 60);

                        $message = "Too many login attempts. Please try again in {$seconds} seconds.";

                        /*
                         * The mobile app reads the 429 status and the
                         * Retry-After header itself, so it keeps both;
                         * the website shows the message on its form.
                         */
                        if ($request->expectsJson()) {
                            return response()->json([
                                'message' => $message,
                                'errors' => ['email' => [$message]],
                            ], 429, $headers);
                        }

                        return back()
                            ->withErrors(['email' => $message])
                            ->onlyInput('email');
                    },
                );
            },
        );
    }
}
