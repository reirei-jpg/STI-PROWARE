<?php

use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\UnpaidOrderExpirationService;

function expiryOrder($studentUser, $variant, int $hoursOld, array $overrides = []): Order
{
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, array_merge([
        'payment_status' => Order::PAYMENT_PENDING,
        'paid_at' => null,
    ], $overrides));

    Order::query()->whereKey($order->id)->update([
        'created_at' => now()->subHours($hoursOld),
    ]);

    return $order->fresh();
}

function expiryReserved($variant): int
{
    return (int) Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->value('quantity_reserved');
}

function expiryRun(): int
{
    return app(UnpaidOrderExpirationService::class)->cancelOverdue();
}

test('an order left unpaid for 48 hours is cancelled and its stock released', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = expiryOrder($studentUser, $variant, 49);

    expect(expiryRun())->toBe(1);

    $order->refresh();

    expect($order->isCancelled())->toBeTrue()
        ->and($order->payment_status)->toBe(Order::PAYMENT_CANCELLED)
        ->and($order->cancelled_by)->toBeNull()
        ->and($order->cancellation_reason)->toBe(Order::CANCEL_REASON_UNPAID_EXPIRED)
        ->and(expiryReserved($variant))->toBe(0);
});

test('the student is told why and the audit log records the system cancel', function () {
    $studentUser = makeStudentAccount();
    $order = expiryOrder($studentUser, makeVariantWithStock(10, 2), 60);

    expiryRun();

    $notification = Notification::query()
        ->where('user_id', $studentUser->id)
        ->where('type', Notification::TYPE_ORDER_CANCELLED)
        ->first();

    expect($notification)->not->toBeNull()
        ->and($notification->message)->toContain('not paid within 48 hours');

    $log = AuditLog::query()->where('action', 'cancelled')->where('subject_id', $order->id)->first();

    expect($log)->not->toBeNull()
        ->and($log->user_id)->toBeNull();
});

test('an order still inside the 48 hours is left alone', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = expiryOrder($studentUser, $variant, 47);

    expect(expiryRun())->toBe(0)
        ->and($order->fresh()->isCancelled())->toBeFalse()
        ->and(expiryReserved($variant))->toBe(2);
});

test('a paid order is never auto-cancelled however old it is', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = expiryOrder($studentUser, $variant, 24 * 30, [
        'payment_status' => Order::PAYMENT_PAID,
        'paid_at' => now()->subDays(29),
    ]);

    expect(expiryRun())->toBe(0)
        ->and($order->fresh()->payment_status)->toBe(Order::PAYMENT_PAID)
        ->and(expiryReserved($variant))->toBe(2);
});

test('a preorder waiting for stock is not auto-cancelled', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);
    $order = expiryOrder($studentUser, $variant, 24 * 10, ['order_type' => Order::TYPE_PREORDER]);
    $order->items()->delete();
    $order->items()->create([
        'product_variant_id' => $variant->id,
        'product_code' => 'PRD-CODE',
        'product_name' => 'Test Product',
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => OrderItem::PREORDER_STATUS_WAITING,
        'quantity' => 1,
        'unit_price' => '100.00',
        'line_total' => '100.00',
    ]);

    expect(expiryRun())->toBe(0)
        ->and($order->fresh()->isCancelled())->toBeFalse();
});

test('an already cancelled or released order is skipped', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 4);

    $cancelled = expiryOrder($studentUser, $variant, 100, [
        'payment_status' => Order::PAYMENT_CANCELLED,
        'fulfillment_status' => Order::FULFILLMENT_CANCELLED,
    ]);

    expect(expiryRun())->toBe(0)
        ->and($cancelled->fresh()->cancellation_reason)->toBeNull()
        ->and(expiryReserved($variant))->toBe(4);
});

test('running it again does nothing further and several overdue orders are all cancelled', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 6);

    expiryOrder($studentUser, $variant, 50);
    expiryOrder($studentUser, $variant, 72);
    expiryOrder($studentUser, $variant, 100);

    expect(expiryRun())->toBe(3)
        ->and(expiryReserved($variant))->toBe(0)
        ->and(expiryRun())->toBe(0);
});
