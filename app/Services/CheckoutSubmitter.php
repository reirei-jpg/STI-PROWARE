<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Notification;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Everything that happens when a student submits a checkout, shared by the
 * website and the mobile app so both follow the same rules and messages.
 */
class CheckoutSubmitter
{
    public function __construct(
        private readonly CheckoutService $checkoutService,
        private readonly PaymentMethodValidator $paymentMethodValidator,
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * Turn the selected cart items into an order.
     *
     * $request carries the payment fields; the confirmation and the item ids
     * must already have been validated (SubmitCheckoutRequest).
     *
     * @param  array<int, int|string>  $itemIds
     * @return array{order: Order, message: string}
     *
     * @throws ValidationException
     */
    public function submit(Request $request, User $user, array $itemIds): array
    {
        $selectedItems = CartItem::query()
            ->whereIn('id', $itemIds)
            ->get();

        $hasPreorderItems = $selectedItems->contains(
            fn (CartItem $item): bool => $item->item_type === CartItem::TYPE_PREORDER,
        );

        $hasNormalItems = $selectedItems->contains(
            fn (CartItem $item): bool => $item->item_type === CartItem::TYPE_ORDER,
        );

        if ($hasPreorderItems && $hasNormalItems) {
            throw ValidationException::withMessages([
                'checkout' => 'Normal merchandise and preorder merchandise cannot be submitted together.',
            ]);
        }

        $isPreorderOnly = $hasPreorderItems && ! $hasNormalItems;

        $paymentMethod = null;
        $paymentReference = null;

        if (! $isPreorderOnly) {
            $payment = $this->paymentMethodValidator->validate($request);

            $paymentMethod = $payment['payment_method'];
            $paymentReference = $payment['payment_reference'];
        }

        /*
         * The uniqueness check on the reference runs before any row exists,
         * so two checkouts sending the same reference at once can both pass
         * it. The database's unique index is what really stops the duplicate,
         * and one transaction rolls back the whole order (items, stock
         * reservations, cart changes) when it does.
         */
        try {
            $order = DB::transaction(
                function () use ($user, $itemIds, $isPreorderOnly, $paymentMethod, $paymentReference): Order {
                    $order = $this->checkoutService->checkoutForStudent($user, $itemIds);

                    if (! $isPreorderOnly) {
                        $order->forceFill([
                            'payment_method' => $paymentMethod,
                            'payment_reference' => $paymentReference,
                        ])->save();
                    }

                    return $order;
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

        /*
         * A preorder-only order has no payment method yet and is not waiting
         * for cashier verification, so the cashiers are told only once a real
         * payment method is attached.
         */
        if (! $isPreorderOnly) {
            $this->notificationService->cashiers(
                type: Notification::TYPE_ORDER_PENDING_PAYMENT,
                title: 'New Order Awaiting Payment',
                message: "{$user->name} placed order {$order->order_number} "
                    .'using '
                    .strtoupper($paymentMethod)
                    .'. Verify and confirm payment when ready.',
                link: "/cashier/orders/{$order->id}",
                data: [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'payment_method' => $order->payment_method,
                    'total' => $order->total,
                ],
            );
        }

        $isPreorder = $order->items()
            ->where('item_type', CartItem::TYPE_PREORDER)
            ->exists();

        return [
            'order' => $order,
            'message' => match (true) {
                $isPreorder => 'Your preorder has been submitted successfully. No payment is required yet. You will be notified when stock becomes available and your preorder is ready for payment.',
                $paymentMethod === 'cash' => 'Your order has been placed successfully. Show your Payment QR to the cashier and pay in cash.',
                default => 'Your order has been placed successfully. Your online payment reference was recorded and is waiting for cashier verification.',
            },
        ];
    }
}
