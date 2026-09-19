<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UnpaidOrderExpirationService
{
    public function __construct(
        private readonly OrderCancellationService $cancellation,
    ) {}

    /**
     * Cancel every order that was never paid within the allowed time,
     * so the stock it reserved goes back to other students.
     *
     * Only orders holding normal merchandise are affected. A preorder
     * still waiting for stock owes no payment and holds nothing, and a
     * ready preorder has its own payment deadline handled by
     * PreorderExpirationService.
     *
     * @return int How many orders were cancelled.
     */
    public function cancelOverdue(?Request $request = null): int
    {
        $request ??= request();

        $overdueIds = Order::query()
            ->where('payment_status', Order::PAYMENT_PENDING)
            ->whereNotIn('fulfillment_status', [
                Order::FULFILLMENT_CANCELLED,
                Order::FULFILLMENT_RELEASED,
            ])
            ->where(
                'created_at',
                '<=',
                now()->subHours(Order::UNPAID_AUTO_CANCEL_HOURS),
            )
            ->whereHas(
                'items',
                fn ($query) => $query->where('item_type', OrderItem::TYPE_ORDER),
            )
            ->orderBy('id')
            ->pluck('id');

        $cancelledCount = 0;

        foreach ($overdueIds as $orderId) {
            $order = Order::query()->find($orderId);

            if (! $order) {
                continue;
            }

            try {
                $this->cancellation->cancel(
                    request: $request,
                    order: $order,
                    actor: null,
                    reason: Order::CANCEL_REASON_UNPAID_EXPIRED,
                );

                $cancelledCount++;
            } catch (ValidationException) {
                // Paid or cancelled by someone else since the list was
                // built. The cancellation service already refused it.
                continue;
            }
        }

        return $cancelledCount;
    }
}
