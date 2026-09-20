<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Middleware\EnsureApiAccountIsUsable;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PROWARE Mobile API, version 1
|--------------------------------------------------------------------------
|
| Used by the STI PROWARE mobile app (students first). Authentication is a
| Sanctum bearer token issued at login. The "login" rate limiter is the same
| one the website uses (5 attempts a minute per email and address).
|
*/

Route::prefix('v1')
    ->name('api.v1.')
    ->group(function (): void {
        Route::post('auth/login', [AuthController::class, 'login'])
            ->middleware('throttle:login')
            ->name('auth.login');

        Route::middleware([
            'auth:sanctum',
            EnsureApiAccountIsUsable::class,
        ])->group(function (): void {
            Route::get('auth/me', [AuthController::class, 'me'])
                ->name('auth.me');

            Route::post('auth/logout', [AuthController::class, 'logout'])
                ->name('auth.logout');

            Route::get('catalog', [CatalogController::class, 'index'])
                ->name('catalog.index');
        });
    });
