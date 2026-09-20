<?php

use App\Http\Middleware\ForcePasswordChange;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\StaffIdleTimeout;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(
    basePath: dirname(__DIR__),
)
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',

        commands: __DIR__.'/../routes/console.php',

        health: '/up',
    )
    ->withMiddleware(
        function (
            Middleware $middleware,
        ): void {
            /*
            |--------------------------------------------------------------------------
            | Trusted Proxies
            |--------------------------------------------------------------------------
            */

            $middleware->trustProxies(
                at: '*',
            );

            /*
            |--------------------------------------------------------------------------
            | Cookie Encryption Exceptions
            |--------------------------------------------------------------------------
            */

            $middleware->encryptCookies(
                except: [
                    'appearance',
                    'sidebar_state',
                ],
            );

            /*
            |--------------------------------------------------------------------------
            | Web Middleware
            |--------------------------------------------------------------------------
            |
            | StaffIdleTimeout applies the inactivity rule only to:
            |
            | - super_admin
            | - admin
            | - specialist
            | - cashier
            |
            | Students and guests are ignored by the middleware itself.
            |
            */

            $middleware->web(
                append: [
                    HandleAppearance::class,

                    HandleInertiaRequests::class,

                    StaffIdleTimeout::class,

                    AddLinkHeadersForPreloadedAssets::class,
                ],
            );

            /*
            |--------------------------------------------------------------------------
            | Middleware Aliases
            |--------------------------------------------------------------------------
            */

            $middleware->alias([
                'role' => RoleMiddleware::class,

                'force.password.change' => ForcePasswordChange::class,
            ]);
        },
    )
    ->withExceptions(
        function (
            Exceptions $exceptions,
        ): void {
            $exceptions->shouldRenderJsonWhen(
                fn (
                    Request $request,
                ): bool => $request->is(
                    'api/*',
                )
                    ||
                    $request->expectsJson(),
            );
        },
    )
    ->create();
