<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CartItemController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PasswordController;
use App\Http\Controllers\Api\V1\PreorderController;
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

            Route::put('auth/password', [PasswordController::class, 'update'])
                ->middleware('throttle:6,1')
                ->name('auth.password');

            Route::get('catalog', [CatalogController::class, 'index'])
                ->name('catalog.index');

            Route::get('catalog/{product}', [CatalogController::class, 'show'])
                ->whereNumber('product')
                ->name('catalog.show');

            Route::get('cart', [CartController::class, 'show'])
                ->name('cart.show');

            Route::post('cart/items', [CartItemController::class, 'store'])
                ->name('cart.items.store');

            Route::patch('cart/items/{cartItem}', [CartItemController::class, 'update'])
                ->whereNumber('cartItem')
                ->name('cart.items.update');

            Route::delete('cart/items/{cartItem}', [CartItemController::class, 'destroy'])
                ->whereNumber('cartItem')
                ->name('cart.items.destroy');

            Route::post('checkout', [CheckoutController::class, 'store'])
                ->name('checkout.store');

            Route::get('orders', [OrderController::class, 'index'])
                ->name('orders.index');

            Route::get('orders/{order}', [OrderController::class, 'show'])
                ->whereNumber('order')
                ->name('orders.show');

            Route::get('orders/{order}/qr', [OrderController::class, 'qr'])
                ->whereNumber('order')
                ->name('orders.qr');

            Route::post('orders/{order}/cancel', [OrderController::class, 'cancel'])
                ->whereNumber('order')
                ->name('orders.cancel');

            Route::post('orders/{order}/payment', [OrderController::class, 'payment'])
                ->whereNumber('order')
                ->name('orders.payment');

            Route::get('preorders', [PreorderController::class, 'index'])
                ->name('preorders.index');
        });
    });
