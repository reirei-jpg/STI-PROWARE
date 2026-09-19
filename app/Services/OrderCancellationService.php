<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderCancellationService
{
    public function __construct(
        private readonly PreorderAvailabilityService $preorderAvailability,
        private readonly StockAlertService $stockAlerts,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * Cancel an order that has not been released yet and give back
     * everything it was holding.
     *
     * $actor is the person cancelling, or null when the system does it
     * automatically. Who is allowed to cancel, and when, is decided by
     * the caller. This only enforces what must be true for ANY cancel.
     *
     * @throws ValidationException
     */
    public function cancel(
        Request $request,
        Order $order,
        ?User $actor,
        string $reason,
        ?string $note = null,
        bool $refundConfirmed = false,
    ): Order {
        /**
         * @var array{
         *     old: array<string, mixed>,
         *     inventoryIds: list<int>,
         *     wasPaid: bool
         * } $result
         */
        $result = DB::transaction(
            function () use (
                $order,
                $actor,
                $reason,
                $note,
                $refundConfirmed,
            ): array {
                /*
                | Lock and re-verify inside the transaction so a cancel can
                | never race with the cashier taking payment or the
                | specialist releasing the merchandise.
                */
                $lockedOrder = Order::query()
                    ->lockForUpdate()
                    ->findOrFail($order->id);

                if ($lockedOrder->isReleased()) {
                    throw ValidationException::withMessages([
                        'order' => 'A released order cannot be cancelled.',
                    ]);
                }

                if (
                    $lockedOrder->isCancelled()
                    || $lockedOrder->payment_status === Order::PAYMENT_REFUNDED
                ) {
                    throw ValidationException::withMessages([
                        'order' => 'This order has already been cancelled.',
                    ]);
                }

                $wasPaid = $lockedOrder->isPaid();

                if ($wasPaid && ! $refundConfirmed) {
                    throw ValidationException::withMessages([
                        'refund_confirmed' => 'Confirm that the student has been refunded before cancelling a paid order.',
                    ]);
                }

                $oldValues = [
                    'payment_status' => $lockedOrder->payment_status,
                    'fulfillment_status' => $lockedOrder->fulfillment_status,
                ];

                $items = OrderItem::query()
                    ->where('order_id', $lockedOrder->id)
                    ->lockForUpdate()
                    ->get();

                $inventoryIds = $this->releaseReservedStock($items);

                $items
                    ->where('item_type', OrderItem::TYPE_PREORDER)
                    ->whereIn('preorder_status', [
                        OrderItem::PREORDER_STATUS_WAITING,
                        OrderItem::PREORDER_STATUS_READY,
                    ])
                    ->each(function (OrderItem $item): void {
                        $item->forceFill([
                            'preorder_status' => OrderItem::PREORDER_STATUS_CANCELLED,
                            'preorder_reserved_quantity' => 0,
                        ])->save();
                    });

                $lockedOrder->forceFill([
                    'payment_status' => $wasPaid
                        ? Order::PAYMENT_REFUNDED
                        : Order::PAYMENT_CANCELLED,
                    'fulfillment_status' => Order::FULFILLMENT_CANCELLED,
                    'cancelled_at' => now(),
                    'cancelled_by' => $actor?->id,
                    'cancellation_reason' => $reason,
                    'cancellation_note' => $note,
                    'refund_confirmed_at' => $wasPaid ? now() : null,
                ])->save();

                return [
                    'old' => $oldValues,
                    'inventoryIds' => $inventoryIds,
                    'wasPaid' => $wasPaid,
                ];
            },
            attempts: 3,
        );

        $order = Order::query()
            ->with('student.user')
            ->findOrFail($order->id);

        /*
        | The stock is free again: let the next waiting preorder claim
        | it, and clear any stale low-stock alerts.
        */
        foreach ($result['inventoryIds'] as $inventoryId) {
            $inventory = Inventory::query()->find($inventoryId);

            if (! $inventory) {
                continue;
            }

            $this->preorderAvailability->check($inventory);

            $this->stockAlerts->check($inventory->fresh());
        }

        AuditLogger::log(
            request: $request,
            action: 'cancelled',
            module: 'orders',
            description: "Cancelled order {$order->order_number} ({$reason}).",
            subject: $order,
            oldValues: $result['old'],
            newValues: [
                'payment_status' => $order->payment_status,
                'fulfillment_status' => $order->fulfillment_status,
                'cancellation_reason' => $reason,
                'cancellation_note' => $note,
                'refund_confirmed' => $result['wasPaid'],
            ],
            actor: $actor,
        );

        $this->notify($order, $actor, $result['wasPaid'], $reason);

        return $order;
    }

    /**
     * Give the reserved stock of every item back to its inventory.
     *
     * @param  Collection<int, OrderItem>  $items
     * @return list<int> The inventories that changed.
     */
    private function releaseReservedStock(Collection $items): array
    {
        $quantitiesByVariant = [];

        foreach ($items as $item) {
            $quantity = $this->reservedQuantityHeldBy($item);

            if ($quantity > 0) {
                $quantitiesByVariant[$item->product_variant_id] =
                    ($quantitiesByVariant[$item->product_variant_id] ?? 0)
                    + $quantity;
            }
        }

        if ($quantitiesByVariant === []) {
            return [];
        }

        $inventories = Inventory::query()
            ->whereIn('product_variant_id', array_keys($quantitiesByVariant))
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        $changed = [];

        foreach ($inventories as $inventory) {
            $toRelease = min(
                $quantitiesByVariant[$inventory->product_variant_id],
                (int) $inventory->quantity_reserved,
            );

            if ($toRelease > 0) {
                $inventory->decrement('quantity_reserved', $toRelease);

                $changed[] = $inventory->id;
            }
        }

        return $changed;
    }

    /**
     * How much stock an item is currently holding in reservation.
     *
     * Normal items, and preorders already paid (which become normal
     * items), reserved their quantity. A ready preorder reserved its own
     * quantity. A preorder still waiting or already expired holds nothing.
     */
    private function reservedQuantityHeldBy(OrderItem $item): int
    {
        if ($item->item_type === OrderItem::TYPE_ORDER) {
            return (int) $item->quantity;
        }

        if (
            $item->item_type === OrderItem::TYPE_PREORDER
            && $item->preorder_status === OrderItem::PREORDER_STATUS_READY
        ) {
            return max(0, (int) $item->preorder_reserved_quantity);
        }

        return 0;
    }

    private function notify(
        Order $order,
        ?User $actor,
        bool $wasPaid,
        string $reason,
    ): void {
        $studentUser = $order->student?->user;

        if ($studentUser && $studentUser->id !== $actor?->id) {
            $this->notifications->send(
                user: $studentUser,
                type: Notification::TYPE_ORDER_CANCELLED,
                title: 'Order Cancelled',
                message: match (true) {
                    $wasPaid => "Order {$order->order_number} was cancelled and refunded.",
                    $reason === Order::CANCEL_REASON_UNPAID_EXPIRED => "Order {$order->order_number} was cancelled because it was not paid within ".Order::UNPAID_AUTO_CANCEL_HOURS.' hours.',
                    default => "Order {$order->order_number} was cancelled.",
                },
                link: route('student.orders.show', $order, false),
            );
        }

        if ($wasPaid) {
            $this->notifications->specialists(
                type: Notification::TYPE_ORDER_CANCELLED,
                title: 'Order Cancelled',
                message: "Order {$order->order_number} was cancelled. Put any prepared items back on the shelf.",
                link: route('specialist.orders.show', $order, false),
            );
        }
    }
}
