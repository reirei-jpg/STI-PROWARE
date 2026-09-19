<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;

class UnclaimedOrderReminderService
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    /**
     * Remind students whose paid order has been ready to pick up for
     * a while. Each milestone is sent once per order, and if several
     * were missed only the latest one is sent.
     *
     * @return int How many reminders were sent.
     */
    public function sendDueReminders(): int
    {
        $firstMilestone = min(Order::UNCLAIMED_REMINDER_DAYS);

        $orders = Order::unclaimed()
            ->with('student.user')
            ->where(
                'ready_for_release_at',
                '<=',
                now()->subDays($firstMilestone),
            )
            ->get();

        $sent = 0;

        foreach ($orders as $order) {
            $milestone = $this->latestMilestoneReached($order);

            if (
                $milestone === null
                || $milestone <= (int) $order->unclaimed_reminder_days
            ) {
                continue;
            }

            $studentUser = $order->student?->user;

            if ($studentUser) {
                $this->notifications->send(
                    user: $studentUser,
                    type: Notification::TYPE_ORDER_UNCLAIMED_REMINDER,
                    title: 'Your order is waiting for you',
                    message: "Order {$order->order_number} has been ready for pickup for {$milestone} days. Please claim it at PROWARE.",
                    link: route('student.orders.show', $order, false),
                );

                $sent++;
            }

            $order->forceFill([
                'unclaimed_reminder_days' => $milestone,
            ])->save();
        }

        return $sent;
    }

    private function latestMilestoneReached(Order $order): ?int
    {
        $reached = collect(Order::UNCLAIMED_REMINDER_DAYS)
            ->filter(fn (int $days): bool => $order->ready_for_release_at
                ->lte(now()->subDays($days)));

        return $reached->isEmpty() ? null : $reached->max();
    }
}
