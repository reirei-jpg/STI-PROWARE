<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\NotificationService;
use App\Services\PaymentMethodValidator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PreorderPaymentController extends Controller
{
    /**
     * Show the payment-method form for a preorder order that
     * has become ready and is now awaiting the student's
     * payment selection.
     *
     * Checkout only attaches a payment method to an order when
     * a normal (in-stock) item is being bought, since a fresh
     * preorder has nothing to pay for yet. This page is the
     * missing follow-up step: once a preorder item becomes
     * ready, the student comes here to submit the same payment
     * information a normal checkout would have collected.
     */
    public function edit(
        Request $request,
        Order $order,
    ): Response|RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        $student =
            $user->student;

        abort_unless(
            $student,
            403,
            'This account does not have a student profile.',
        );

        abort_unless(
            $order->student_id
                === $student->id,
            403,
            'You are not allowed to view this order.',
        );

        $order->load([
            'items.productVariant.product.category',
        ]);

        $readyItems =
            $order->items
                ->where(
                    'preorder_status',
                    OrderItem::PREORDER_STATUS_READY,
                )
                ->values();

        if (
            $order->payment_method !== null
            || $readyItems->isEmpty()
        ) {
            return redirect()
                ->route(
                    'student.orders.show',
                    $order,
                )
                ->with(
                    'error',
                    'This preorder is not currently awaiting a payment method.',
                );
        }

        $items =
            $readyItems->map(
                function (OrderItem $item): array {
                    $variant =
                        $item->productVariant;

                    $product =
                        $variant?->product;

                    return [
                        'id' => $item->id,

                        'item_type' => $item->item_type,

                        'quantity' => $item->quantity,

                        'unit_price' => (string) $item->unit_price,

                        'line_total' => (string) $item->line_total,

                        'variant' => [
                            'id' => $variant?->id,

                            'sku' => $variant?->sku,

                            'program' => $variant?->program,

                            'size' => $variant?->size,

                            'variant_name' => $variant?->variant_name,
                        ],

                        'product' => [
                            'id' => $product?->id,

                            'code' => $product?->code,

                            'name' => $product?->name,

                            'preorder_early_bird_slots' => $product?->preorder_early_bird_slots,

                            'preorder_early_bird_discount_percent' => $product?->preorder_early_bird_discount_percent,

                            'image_url' => $product?->image_path
                                ? asset(
                                    'storage/'
                                    .$product->image_path,
                                )
                                : null,

                            'category' => [
                                'id' => $product?->category?->id,

                                'name' => $product?->category?->name,
                            ],
                        ],
                    ];
                },
            )
                ->values();

        return Inertia::render(
            'checkout/Index',
            [
                'student' => [
                    'name' => $user->name,

                    'email' => $user->email,

                    'student_id' => $student->student_id,

                    'course' => $student->course,

                    'year_level' => $student->year_level,
                ],

                'cart' => [
                    'id' => $order->id,

                    'total_quantity' => $items->sum('quantity'),

                    'subtotal' => number_format(
                        $items->sum(
                            fn (array $item): float => (float) $item['line_total'],
                        ),
                        2,
                        '.',
                        '',
                    ),

                    'items' => $items,
                ],

                'preorderPayment' => [
                    'order_id' => $order->id,

                    'order_number' => $order->order_number,
                ],
            ],
        );
    }

    /**
     * Attach the student's submitted payment method to a
     * ready preorder order. The cashier confirms it exactly
     * like a normal order from this point on.
     */
    public function update(
        Request $request,
        Order $order,
        PaymentMethodValidator $paymentMethodValidator,
        NotificationService $notificationService,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        $student =
            $user->student;

        abort_unless(
            $student,
            403,
            'This account does not have a student profile.',
        );

        abort_unless(
            $order->student_id
                === $student->id,
            403,
            'You are not allowed to modify this order.',
        );

        $payment =
            $paymentMethodValidator->validate(
                $request,
            );

        $saved =
            DB::transaction(
                function () use (
                    $order,
                    $payment,
                ): ?Order {
                    $locked =
                        Order::query()
                            ->whereKey(
                                $order->id,
                            )
                            ->lockForUpdate()
                            ->first();

                    if (
                        ! $locked
                        || $locked->payment_method !== null
                    ) {
                        return null;
                    }

                    $stillReady =
                        $locked->items()
                            ->where(
                                'preorder_status',
                                OrderItem::PREORDER_STATUS_READY,
                            )
                            ->exists();

                    if (! $stillReady) {
                        return null;
                    }

                    $locked->forceFill([
                        'payment_method' => $payment['payment_method'],

                        'payment_reference' => $payment['payment_reference'],
                    ])->save();

                    return $locked;
                },
            );

        if (! $saved) {
            return redirect()
                ->route(
                    'student.orders.show',
                    $order,
                )
                ->with(
                    'error',
                    'This preorder is not currently awaiting a payment method.',
                );
        }

        $notificationService->cashiers(
            type: Notification::TYPE_ORDER_PENDING_PAYMENT,

            title: 'Preorder Ready for Payment',

            message: "{$user->name} submitted payment for ready preorder {$saved->order_number} "
                .'using '
                .strtoupper($payment['payment_method'])
                .'. Verify and confirm payment when ready.',

            link: "/cashier/orders/{$saved->id}",

            data: [
                'order_id' => $saved->id,

                'order_number' => $saved->order_number,

                'payment_method' => $saved->payment_method,

                'total' => $saved->total,
            ],
        );

        return redirect()
            ->route(
                'student.orders.show',
                $saved,
            )
            ->with(
                'success',
                'Payment method submitted. Show your Payment QR to the cashier to complete payment.',
            );
    }
}
