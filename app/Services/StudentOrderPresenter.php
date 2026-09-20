<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use Carbon\CarbonInterface;

/**
 * How a student's order is described to the mobile app: one status with its
 * wording, which QR to show, and whether the student can still cancel.
 * Every rule underneath (cancel window, cancellation summary) is the Order
 * model's own, the same ones the website uses.
 */
class StudentOrderPresenter
{
    /**
     * The short version shown in the "My Orders" list.
     *
     * @return array<string, mixed>
     */
    public function summary(Order $order): array
    {
        $previewItem = $order->items->first();

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'order_type' => $order->order_type,
            'status' => $this->status($order),
            'payment_status' => $order->payment_status,
            'fulfillment_status' => $order->fulfillment_status,
            'total' => (string) $order->total,
            'total_quantity' => $order->totalQuantity(),
            'preview_item' => $previewItem
                ? [
                    'product_name' => $previewItem->product_name,
                    'variant_name' => $previewItem->variant_name,
                    'quantity' => $previewItem->quantity,
                    'image_url' => $this->imageUrl($previewItem),
                ]
                : null,
            'additional_items_count' => max($order->items->count() - 1, 0),
            'created_at' => $this->displayTime($order->created_at),
        ];
    }

    /**
     * Everything the order page shows.
     *
     * @return array<string, mixed>
     */
    public function detail(Order $order): array
    {
        $order->loadMissing(['items.productVariant.product', 'canceller']);

        $blockedReason = $order->studentCancelBlockedReason();

        return [
            ...$this->summary($order),
            'payment_method' => $order->payment_method,
            'subtotal' => (string) $order->subtotal,
            'transaction_number' => $order->transaction_number,
            'paid_at' => $this->displayTime($order->paid_at),
            'ready_for_release_at' => $this->displayTime($order->ready_for_release_at),
            'released_at' => $this->displayTime($order->released_at),
            'cancelled_at' => $this->displayTime($order->cancelled_at),
            'qr' => $this->qr($order),
            'can_cancel' => $blockedReason === null,
            'cancel_blocked_reason' => $blockedReason,
            'cancel_until' => $this->displayTime($order->studentCancelDeadline()),
            'cancellation' => $order->cancellationSummary(),
            'items' => $order->items
                ->map(fn (OrderItem $item): array => [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'variant_name' => $item->variant_name,
                    'item_type' => $item->item_type,
                    'preorder_status' => $item->preorder_status,
                    'preorder_payment_deadline_at' => $this->displayTime($item->preorder_payment_deadline_at),
                    'quantity' => $item->quantity,
                    'unit_price' => (string) $item->unit_price,
                    'line_total' => (string) $item->line_total,
                    'image_url' => $this->imageUrl($item),
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * The one word (and sentence) that says where the order stands. Same
     * wording as the website's order page.
     *
     * @return array{key: string, label: string, description: string}
     */
    public function status(Order $order): array
    {
        if ($this->hasPreorderItem($order, OrderItem::PREORDER_STATUS_READY)) {
            return [
                'key' => 'ready_for_payment',
                'label' => 'Ready for Payment',
                'description' => 'Your preorder merchandise is now available. Complete your payment before the deadline to keep your reserved merchandise.',
            ];
        }

        if ($this->hasPreorderItem($order, OrderItem::PREORDER_STATUS_WAITING)) {
            return [
                'key' => 'waiting_for_stock',
                'label' => 'Waiting for Stock',
                'description' => 'Your preorder has been submitted. No payment is required yet. You will be notified when stock becomes available and your preorder is ready for payment.',
            ];
        }

        if ($this->isCancelled($order)) {
            return [
                'key' => 'cancelled',
                'label' => 'Cancelled',
                'description' => 'This order has been cancelled and will not continue to fulfillment.',
            ];
        }

        return match (true) {
            $order->fulfillment_status === Order::FULFILLMENT_RELEASED => [
                'key' => 'released',
                'label' => 'Released',
                'description' => 'Your merchandise has been successfully released and this order is complete.',
            ],
            $order->fulfillment_status === Order::FULFILLMENT_READY => [
                'key' => 'ready_for_pickup',
                'label' => 'Ready for Pickup',
                'description' => 'Your merchandise is ready for pickup at PROWARE.',
            ],
            $order->fulfillment_status === Order::FULFILLMENT_PREPARING => [
                'key' => 'preparing',
                'label' => 'Preparing',
                'description' => 'PROWARE is currently preparing your merchandise.',
            ],
            $order->payment_status === Order::PAYMENT_PAID => [
                'key' => 'payment_confirmed',
                'label' => 'Payment Confirmed',
                'description' => 'The cashier confirmed payment. Your order may now proceed to fulfillment.',
            ],
            default => [
                'key' => 'pending_payment',
                'label' => 'Pending Payment',
                'description' => 'Your order was created and the merchandise is reserved. Payment must be confirmed before release.',
            ],
        };
    }

    /**
     * Which QR the student shows, if any. The QR image itself is served by
     * the API (the token never has to be sent to the app).
     *
     * @return array{kind: ?string, title: string, message: string}
     */
    public function qr(Order $order): array
    {
        $none = fn (string $message): array => [
            'kind' => null,
            'title' => 'QR code',
            'message' => $message,
        ];

        if ($this->isCancelled($order)) {
            return $none('This order has been cancelled.');
        }

        if ($this->hasPreorderItem($order, OrderItem::PREORDER_STATUS_WAITING)) {
            return $none('Your preorder has been submitted successfully. No payment is required yet. You will be notified once stock is available and your preorder becomes ready for payment.');
        }

        if (
            $this->hasPreorderItem($order, OrderItem::PREORDER_STATUS_READY)
            && $order->payment_method === null
        ) {
            return $none('Your preorder merchandise is now available. Choose how you will pay to continue.');
        }

        if ($order->fulfillment_status === Order::FULFILLMENT_RELEASED) {
            return $none('This order has already been released.');
        }

        if ($order->payment_status === Order::PAYMENT_PAID) {
            if ($order->release_qr_used_at !== null) {
                return $none('This Release QR has already been used.');
            }

            return $order->release_qr_token
                ? [
                    'kind' => 'release',
                    'title' => 'Show QR to PROWARE Specialist',
                    'message' => 'Present this Release QR to the PROWARE Specialist for preparation and merchandise claiming.',
                ]
                : $none('QR code is not available for this order.');
        }

        return $order->qr_token
            ? [
                'kind' => 'payment',
                'title' => 'Show QR to Cashier',
                'message' => 'Present this Payment QR to the Cashier when confirming your payment.',
            ]
            : $none('QR code is not available for this order.');
    }

    /**
     * The text the QR image encodes (the same token the website's QR holds),
     * or null when no QR is shown.
     */
    public function qrToken(Order $order): ?string
    {
        return match ($this->qr($order)['kind']) {
            'release' => $order->release_qr_token,
            'payment' => $order->qr_token,
            default => null,
        };
    }

    private function isCancelled(Order $order): bool
    {
        return $order->isCancelled()
            || $order->payment_status === Order::PAYMENT_REFUNDED;
    }

    private function hasPreorderItem(Order $order, string $preorderStatus): bool
    {
        return $order->items->contains(
            fn (OrderItem $item): bool => $item->item_type === OrderItem::TYPE_PREORDER
                && $item->preorder_status === $preorderStatus,
        );
    }

    private function imageUrl(OrderItem $item): ?string
    {
        $imagePath = $item->productVariant?->product?->image_path;

        return $imagePath ? asset('storage/'.ltrim($imagePath, '/')) : null;
    }

    private function displayTime(?CarbonInterface $dateTime): ?string
    {
        return $dateTime
            ?->copy()
            ->timezone(config('app.display_timezone'))
            ->format('M d, Y h:i A');
    }
}
