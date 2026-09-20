<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\PreorderPaymentSubmitter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
     *
     * The rules live in PreorderPaymentSubmitter, shared with the
     * mobile app.
     */
    public function update(
        Request $request,
        Order $order,
        PreorderPaymentSubmitter $preorderPaymentSubmitter,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        $student = $user->student;

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

        $saved = $preorderPaymentSubmitter->submit($request, $order, $user);

        if (! $saved) {
            return redirect()
                ->route('student.orders.show', $order)
                ->with('error', PreorderPaymentSubmitter::NOT_AWAITING_MESSAGE);
        }

        return redirect()
            ->route('student.orders.show', $saved)
            ->with('success', PreorderPaymentSubmitter::SUCCESS_MESSAGE);
    }
}
