<?php

use App\Models\Notification;
use App\Models\Order;
use App\Services\UnclaimedOrderReminderService;

function milestoneReadyOrder($studentUser, int $daysReady, array $overrides = []): Order
{
    return makePaidOrderWithItem(
        $studentUser->student,
        $studentUser,
        makeVariantWithStock(10, 1),
        1,
        array_merge([
            'fulfillment_status' => Order::FULFILLMENT_READY,
            'ready_for_release_at' => now()->subDays($daysReady)->subMinutes(5),
        ], $overrides),
    );
}

function milestoneRun(): int
{
    return app(UnclaimedOrderReminderService::class)->sendDueReminders();
}

function milestoneCount($studentUser): int
{
    return Notification::query()
        ->where('user_id', $studentUser->id)
        ->where('type', Notification::TYPE_ORDER_UNCLAIMED_REMINDER)
        ->count();
}

test('a student is reminded once an order has been ready for 7 days', function () {
    $studentUser = makeStudentAccount();
    $order = milestoneReadyOrder($studentUser, 7);

    expect(milestoneRun())->toBe(1)
        ->and(milestoneCount($studentUser))->toBe(1)
        ->and($order->fresh()->unclaimed_reminder_days)->toBe(7);

    $notification = Notification::query()->where('user_id', $studentUser->id)->first();

    expect($notification->message)->toContain($order->order_number)
        ->and($notification->message)->toContain('7 days')
        ->and($notification->link)->toBe("/student/orders/{$order->id}");
});

test('no reminder is sent before 7 days', function () {
    $studentUser = makeStudentAccount();
    milestoneReadyOrder($studentUser, 6);

    expect(milestoneRun())->toBe(0)
        ->and(milestoneCount($studentUser))->toBe(0);
});

test('running again on the same day sends no duplicate', function () {
    $studentUser = makeStudentAccount();
    milestoneReadyOrder($studentUser, 8);

    milestoneRun();

    expect(milestoneRun())->toBe(0)
        ->and(milestoneCount($studentUser))->toBe(1);
});

test('each milestone sends one more reminder as the wait grows', function () {
    $studentUser = makeStudentAccount();
    $order = milestoneReadyOrder($studentUser, 7);

    milestoneRun();

    $order->forceFill(['ready_for_release_at' => now()->subDays(14)->subMinute()])->save();
    milestoneRun();

    $order->forceFill(['ready_for_release_at' => now()->subDays(31)])->save();
    milestoneRun();

    // Nothing further once the last milestone has been sent.
    $order->forceFill(['ready_for_release_at' => now()->subDays(60)])->save();

    expect(milestoneRun())->toBe(0)
        ->and(milestoneCount($studentUser))->toBe(3)
        ->and($order->fresh()->unclaimed_reminder_days)->toBe(30);
});

test('missed milestones collapse into a single latest reminder', function () {
    $studentUser = makeStudentAccount();
    $order = milestoneReadyOrder($studentUser, 20);

    expect(milestoneRun())->toBe(1)
        ->and(milestoneCount($studentUser))->toBe(1)
        ->and($order->fresh()->unclaimed_reminder_days)->toBe(14);
});

test('only paid orders that are ready for pickup are reminded', function () {
    $studentUser = makeStudentAccount();

    milestoneReadyOrder($studentUser, 20, ['fulfillment_status' => Order::FULFILLMENT_RELEASED]);
    milestoneReadyOrder($studentUser, 20, ['fulfillment_status' => Order::FULFILLMENT_CANCELLED]);
    milestoneReadyOrder($studentUser, 20, ['fulfillment_status' => Order::FULFILLMENT_PREPARING]);
    milestoneReadyOrder($studentUser, 20, ['payment_status' => Order::PAYMENT_PENDING]);

    expect(milestoneRun())->toBe(0)
        ->and(milestoneCount($studentUser))->toBe(0);
});
