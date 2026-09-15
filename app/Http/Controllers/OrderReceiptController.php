<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderReceiptController extends Controller
{
    /**
     * Display the digital / printable
     * PROWARE payment receipt.
     */
    public function show(
        Request $request,
        Order $order,
    ): Response {
        /*
        |--------------------------------------------------------------------------
        | Current User
        |--------------------------------------------------------------------------
        */

        $user =
            $request->user();

        abort_unless(
            $user,
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Receipt Requires Confirmed Payment
        |--------------------------------------------------------------------------
        |
        | A receipt should only be available
        | once the Cashier has confirmed payment.
        |
        | We intentionally DO NOT require
        | transaction_number or release_qr_token
        | here because older paid test orders
        | may not yet contain those newer fields.
        |
        */

        abort_unless(
            $order->payment_status
            === Order::PAYMENT_PAID,
            404,
        );

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        |
        | Student:
        | Can only view their own receipt.
        |
        | Cashier:
        | Can view paid receipts.
        |
        */

        if (
            $user->role ===
            'student'
        ) {
            abort_unless(
                $user->student
                && $order->student_id
                    === $user
                        ->student
                        ->id,
                403,
            );
        } elseif (
            $user->role !==
            'cashier'
        ) {
            abort(
                403,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Load Relationships
        |--------------------------------------------------------------------------
        */

        $order->load([
            'student.user',
            'items',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Cashier Who Confirmed Payment
        |--------------------------------------------------------------------------
        |
        | payment_confirmed_by stores
        | the Cashier's USER ID.
        |
        | Example:
        |
        | payment_confirmed_by = 7
        |
        | We resolve that to:
        |
        | Cashier Name = Maria Santos
        |
        */

        $cashier =
            null;

        if (
            $order->payment_confirmed_by
        ) {
            $cashier =
                User::query()
                    ->find(
                        $order
                            ->payment_confirmed_by,
                    );
        }

        /*
        |--------------------------------------------------------------------------
        | Total Quantity
        |--------------------------------------------------------------------------
        |
        | Calculate total merchandise quantity
        | directly from the order items.
        |
        */

        $totalQuantity =
            (int)
            $order
                ->items
                ->sum(
                    'quantity',
                );

        /*
        |--------------------------------------------------------------------------
        | Payment Method
        |--------------------------------------------------------------------------
        |
        | New orders:
        |
        | cash
        | gcash
        | maya
        |
        | Older orders may contain null.
        |
        */

        $paymentMethod =
            $order
                ->payment_method;

        /*
        |--------------------------------------------------------------------------
        | Payment Reference
        |--------------------------------------------------------------------------
        |
        | CASH:
        | null
        |
        | GCASH / MAYA:
        | Transaction/reference number
        |
        */

        $paymentReference =
            $order
                ->payment_reference;

        /*
        |--------------------------------------------------------------------------
        | Render Receipt
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'receipts/Show',
            [
                /*
                 * Used by the frontend to decide
                 * where the Back button should go.
                 */
                'viewer' => $user->role,

                /*
                 * Receipt information.
                 */
                'order' => [
                    /*
                    |--------------------------------------------------------------------------
                    | Order
                    |--------------------------------------------------------------------------
                    */

                    'id' => $order->id,

                    'transaction_number' => $order
                        ->transaction_number,

                    'order_number' => $order
                        ->order_number,

                    'order_type' => $order
                        ->order_type,

                    /*
                    |--------------------------------------------------------------------------
                    | Status
                    |--------------------------------------------------------------------------
                    */

                    'payment_status' => $order
                        ->payment_status,

                    'fulfillment_status' => $order
                        ->fulfillment_status,

                    /*
                    |--------------------------------------------------------------------------
                    | Amounts
                    |--------------------------------------------------------------------------
                    */

                    'subtotal' => (string)
                        $order
                            ->subtotal,

                    'total' => (string)
                        $order
                            ->total,

                    /*
                    |--------------------------------------------------------------------------
                    | Tax Breakdown
                    |--------------------------------------------------------------------------
                    |
                    | `total` already includes tax. These values only
                    | disclose the breakdown; they do not change what
                    | the student was charged.
                    |
                    */

                    'tax_rate' => (string)
                        ($order->tax_rate
                            ?? Order::TAX_RATE * 100),

                    'tax_amount' => (string)
                        ($order->tax_amount
                            ?? '0.00'),

                    'vatable_sales' => $order->vatableSales(),

                    'total_quantity' => $totalQuantity,

                    /*
                    |--------------------------------------------------------------------------
                    | Dates
                    |--------------------------------------------------------------------------
                    */

                    'created_at' => $order
                        ->created_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'paid_at' => $order
                        ->paid_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    /*
                    |--------------------------------------------------------------------------
                    | Payment Information
                    |--------------------------------------------------------------------------
                    |
                    | The receipt frontend will
                    | display these values.
                    |
                    */

                    'payment_method' => $paymentMethod,

                    'payment_reference' => $paymentReference,

                    /*
                    |--------------------------------------------------------------------------
                    | Cashier
                    |--------------------------------------------------------------------------
                    |
                    | Send the NAME to the receipt.
                    | Never display the raw user ID.
                    |
                    */

                    'cashier' => [
                        'name' => $cashier
                            ?->name
                            ?? 'Cashier unavailable',
                    ],

                    /*
                    |--------------------------------------------------------------------------
                    | Release QR
                    |--------------------------------------------------------------------------
                    */

                    'release_qr_token' => $order
                        ->release_qr_token,

                    'release_qr_used' => $order
                        ->release_qr_used_at
                        !== null,

                    /*
                    |--------------------------------------------------------------------------
                    | Student
                    |--------------------------------------------------------------------------
                    */

                    'student' => [
                        'name' => $order
                            ->student
                            ?->user
                            ?->name
                            ?? 'Unknown Student',

                        'student_id' => $order
                            ->student
                            ?->student_id
                            ?? 'N/A',

                        'course' => $order
                            ->student
                            ?->course
                            ?? 'N/A',

                        'year_level' => $order
                            ->student
                            ?->year_level
                            ?? 'N/A',
                    ],

                    /*
                    |--------------------------------------------------------------------------
                    | Ordered Items
                    |--------------------------------------------------------------------------
                    */

                    'items' => $order
                        ->items
                        ->map(
                            fn (
                                $item,
                            ): array => [
                                'id' => $item
                                    ->id,

                                'product_code' => $item
                                    ->product_code,

                                'product_name' => $item
                                    ->product_name,

                                'variant_name' => $item
                                    ->variant_name,

                                'sku' => $item
                                    ->sku,

                                'program' => $item
                                    ->program,

                                'size' => $item
                                    ->size,

                                'item_type' => $item
                                    ->item_type,

                                'quantity' => $item
                                    ->quantity,

                                'unit_price' => (string)
                                    $item
                                        ->unit_price,

                                'line_total' => (string)
                                    $item
                                        ->line_total,
                            ],
                        )
                        ->values(),
                ],
            ],
        );
    }
}
