<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A preorder has nothing to pay for until stock is ready. Once it is, the
 * student submits a payment method and reference here; the cashier then
 * confirms it like any other order. Shared by the website and the mobile app.
 */
class PreorderPaymentSubmitter
{
    public const SUCCESS_MESSAGE = 'Payment method submitted. Show your Payment QR to the cashier to complete payment.';

    public const NOT_AWAITING_MESSAGE = 'This preorder is not currently awaiting a payment method.';

    public function __construct(
        private readonly PaymentMethodValidator $paymentMethodValidator,
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * Attach the submitted payment method to a ready preorder order.
     *
     * $request carries the payment fields. Ownership of the order has already
     * been checked by the caller. Returns null when the order is not (or no
     * longer) waiting for a payment method, e.g. it was already submitted.
     *
     * @throws ValidationException
     */
    public function submit(Request $request, Order $order, User $student): ?Order
    {
        $payment = $this->paymentMethodValidator->validate($request);

        try {
            $saved = DB::transaction(
                function () use ($order, $payment): ?Order {
                    $locked = Order::query()
                        ->whereKey($order->id)
                        ->lockForUpdate()
                        ->first();

                    if (! $locked || $locked->payment_method !== null) {
                        return null;
                    }

                    $stillReady = $locked->items()
                        ->where('preorder_status', OrderItem::PREORDER_STATUS_READY)
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
        } catch (QueryException $exception) {
            if (str_contains($exception->getMessage(), 'orders_payment_reference_unique')) {
                throw ValidationException::withMessages([
                    'payment_reference' => 'This payment reference has already been used for another order. Please check your transaction and try again.',
                ]);
            }

            throw $exception;
        }

        if (! $saved) {
            return null;
        }

        $this->notificationService->cashiers(
            type: Notification::TYPE_ORDER_PENDING_PAYMENT,
            title: 'Preorder Ready for Payment',
            message: "{$student->name} submitted payment for ready preorder {$saved->order_number} "
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

        return $saved;
    }
}
