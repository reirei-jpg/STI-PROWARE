<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class QrOrderScanController extends Controller
{
    /**
     * Route a scanned PROWARE QR to the correct
     * secure one-time scanner based on staff role.
     */
    public function show(
        Request $request,
        string $token,
    ): RedirectResponse {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Authorized Scanner Roles Only
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && in_array(
                $user->role,
                [
                    'cashier',
                    'specialist',
                ],
                true,
            ),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | CASHIER — Payment QR
        |--------------------------------------------------------------------------
        |
        | The Cashier may only scan qr_token.
        |
        | We DO NOT consume the QR here.
        | CashierOrderController::scan() performs the
        | secure transaction and one-time consumption.
        |
        */

        if (
            $user->role ===
            'cashier'
        ) {
            $order =
                Order::query()
                    ->where(
                        'qr_token',
                        $token,
                    )
                    ->first();

            if (! $order) {
                return redirect()
                    ->route(
                        'cashier.dashboard',
                    )
                    ->with(
                        'error',
                        'Invalid PROWARE Payment QR. This QR code cannot be used by the Cashier.',
                    );
            }

            /*
             * Send the ORIGINAL token into the
             * protected Cashier scan() method.
             */
            return redirect()
                ->route(
                    'cashier.orders.scan',
                    [
                        'token' => $token,
                    ],
                );
        }

        /*
        |--------------------------------------------------------------------------
        | SPECIALIST — Release QR
        |--------------------------------------------------------------------------
        |
        | The Specialist may only scan release_qr_token.
        |
        | We DO NOT consume the QR here.
        | OrderScanController::show() performs the
        | secure transaction and one-time consumption.
        |
        */

        $order =
            Order::query()
                ->where(
                    'release_qr_token',
                    $token,
                )
                ->first();

        if (! $order) {
            return redirect()
                ->route(
                    'specialist.dashboard',
                )
                ->with(
                    'error',
                    'Invalid PROWARE Release QR. This QR code cannot be used by the Specialist.',
                );
        }

        /*
         * Send the ORIGINAL Release QR token
         * into the protected Specialist scanner.
         */
        return redirect()
            ->route(
                'specialist.orders.scan',
                [
                    'token' => $token,
                ],
            );
    }
}
