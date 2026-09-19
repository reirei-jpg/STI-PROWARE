<?php

use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderCancellationService;
use Illuminate\Validation\ValidationException;

function cancellationCashier(): User
{
    return User::factory()->create(['role' => 'cashier', 'is_active' => true]);
}

function cancellationRun(Order $order, ?User $actor, array $overrides = []): Order
{
    return app(OrderCancellationService::class)->cancel(
        request(),
        $order,
        $actor,
        $overrides['reason'] ?? Order::CANCEL_REASON_STUDENT_REQUEST,
        $overrides['note'] ?? null,
        $overrides['refund'] ?? false,
    );
}

function cancellationReserved($variant): int
{
    return (int) Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->value('quantity_reserved');
}

function cancellationPreorderItem(Order $order, $variant, string $status, int $quantity, array $extra = []): OrderItem
{
    return $order->items()->create(array_merge([
        'product_variant_id' => $variant->id,
        'product_code' => 'PRD-CODE',
        'product_name' => 'Test Product',
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => $status,
        'preorder_reserved_quantity' => $status === OrderItem::PREORDER_STATUS_READY ? $quantity : 0,
        'quantity' => $quantity,
        'unit_price' => '100.00',
        'line_total' => (string) (100 * $quantity),
    ], $extra));
}

test('cancelling an unpaid order releases its reserved stock and records who and why', function () {
    $studentUser = makeStudentAccount();
    $cashier = cancellationCashier();
    $variant = makeVariantWithStock(10, 3);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 3, [
        'payment_status' => Order::PAYMENT_PENDING,
        'paid_at' => null,
    ]);

    $cancelled = cancellationRun($order, $cashier, [
        'reason' => Order::CANCEL_REASON_WRONG_ITEM,
        'note' => 'Picked the wrong size.',
    ]);

    expect($cancelled->payment_status)->toBe(Order::PAYMENT_CANCELLED)
        ->and($cancelled->fulfillment_status)->toBe(Order::FULFILLMENT_CANCELLED)
        ->and($cancelled->cancelled_at)->not->toBeNull()
        ->and($cancelled->cancelled_by)->toBe($cashier->id)
        ->and($cancelled->cancellation_reason)->toBe(Order::CANCEL_REASON_WRONG_ITEM)
        ->and($cancelled->cancellation_note)->toBe('Picked the wrong size.')
        ->and($cancelled->refund_confirmed_at)->toBeNull()
        ->and(cancellationReserved($variant))->toBe(0)
        ->and((int) $variant->inventory->fresh()->quantity_on_hand)->toBe(10);
});

test('cancelling writes an audit log entry and tells the student when staff cancel', function () {
    $studentUser = makeStudentAccount();
    $cashier = cancellationCashier();
    $variant = makeVariantWithStock(10, 1);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);

    cancellationRun($order, $cashier);

    $log = AuditLog::query()->where('action', 'cancelled')->where('module', 'orders')->first();

    expect($log)->not->toBeNull()
        ->and($log->user_id)->toBe($cashier->id)
        ->and($log->subject_id)->toBe($order->id)
        ->and($log->new_values['cancellation_reason'])->toBe(Order::CANCEL_REASON_STUDENT_REQUEST);

    expect(Notification::query()
        ->where('user_id', $studentUser->id)
        ->where('type', Notification::TYPE_ORDER_CANCELLED)
        ->count())->toBe(1);

    // An unpaid order has nothing prepared, so the specialists are not bothered.
    expect(Notification::query()->where('type', Notification::TYPE_ORDER_CANCELLED)->count())->toBe(1);
});

test('the student is not notified about a cancel they made themselves', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 1);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);

    cancellationRun($order, $studentUser);

    expect(Notification::query()->where('user_id', $studentUser->id)->count())->toBe(0);
});

test('a paid order cannot be cancelled without confirming the refund', function () {
    $studentUser = makeStudentAccount();
    $cashier = cancellationCashier();
    $variant = makeVariantWithStock(10, 2);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2);

    expect(fn () => cancellationRun($order, $cashier))
        ->toThrow(ValidationException::class);

    expect($order->fresh()->isCancelled())->toBeFalse()
        ->and($order->fresh()->payment_status)->toBe(Order::PAYMENT_PAID)
        ->and(cancellationReserved($variant))->toBe(2);
});

test('a refunded paid order leaves the paid totals, frees stock and alerts specialists', function () {
    $studentUser = makeStudentAccount();
    $cashier = cancellationCashier();
    $specialist = makeSpecialist();
    $variant = makeVariantWithStock(10, 2);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'fulfillment_status' => Order::FULFILLMENT_READY,
    ]);

    $cancelled = cancellationRun($order, $cashier, ['refund' => true]);

    expect($cancelled->payment_status)->toBe(Order::PAYMENT_REFUNDED)
        ->and($cancelled->refund_confirmed_at)->not->toBeNull()
        ->and($cancelled->isCancelled())->toBeTrue()
        ->and(cancellationReserved($variant))->toBe(0)
        ->and(Order::query()->where('payment_status', Order::PAYMENT_PAID)->count())->toBe(0);

    expect(Notification::query()
        ->where('user_id', $specialist->id)
        ->where('type', Notification::TYPE_ORDER_CANCELLED)
        ->count())->toBe(1);
});

test('a released order cannot be cancelled', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now(),
    ]);

    expect(fn () => cancellationRun($order, cancellationCashier(), ['refund' => true]))
        ->toThrow(ValidationException::class, 'A released order cannot be cancelled.');

    expect($order->fresh()->fulfillment_status)->toBe(Order::FULFILLMENT_RELEASED);
});

test('cancelling twice is rejected and releases the stock only once', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 5);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);

    cancellationRun($order, cancellationCashier());

    expect(fn () => cancellationRun($order, cancellationCashier()))
        ->toThrow(ValidationException::class, 'This order has already been cancelled.');

    // 5 reserved in total, only this order's 2 given back.
    expect(cancellationReserved($variant))->toBe(3);
});

test('the system can cancel an order with no actor', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 1);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);

    $cancelled = cancellationRun($order, null, ['reason' => Order::CANCEL_REASON_UNPAID_EXPIRED]);

    expect($cancelled->cancelled_by)->toBeNull()
        ->and($cancelled->cancellation_reason)->toBe(Order::CANCEL_REASON_UNPAID_EXPIRED)
        ->and(Notification::query()->where('user_id', $studentUser->id)->count())->toBe(1);
});

test('cancelling releases a ready preorder reservation and marks the item cancelled', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 4);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'payment_status' => Order::PAYMENT_PENDING,
        'order_type' => Order::TYPE_PREORDER,
    ]);
    $order->items()->delete();

    $ready = cancellationPreorderItem($order, $variant, OrderItem::PREORDER_STATUS_READY, 4);

    cancellationRun($order, cancellationCashier());

    expect(cancellationReserved($variant))->toBe(0)
        ->and($ready->fresh()->preorder_status)->toBe(OrderItem::PREORDER_STATUS_CANCELLED)
        ->and($ready->fresh()->preorder_reserved_quantity)->toBe(0);
});

test('cancelling a waiting preorder touches no stock but takes it out of the queue', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'payment_status' => Order::PAYMENT_PENDING,
        'order_type' => Order::TYPE_PREORDER,
    ]);
    $order->items()->delete();

    $waiting = cancellationPreorderItem($order, $variant, OrderItem::PREORDER_STATUS_WAITING, 3);

    cancellationRun($order, cancellationCashier());

    expect(cancellationReserved($variant))->toBe(2)
        ->and($waiting->fresh()->preorder_status)->toBe(OrderItem::PREORDER_STATUS_CANCELLED);
});

test('freed stock moves the next waiting preorder forward', function () {
    $studentUser = makeStudentAccount();
    $otherStudent = makeStudentAccount();
    $variant = makeVariantWithStock(2, 2);

    $blockingOrder = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);

    $waitingOrder = makePaidOrderWithItem($otherStudent->student, $otherStudent, $variant, 1, [
        'payment_status' => Order::PAYMENT_PENDING,
        'order_type' => Order::TYPE_PREORDER,
    ]);
    $waitingOrder->items()->delete();
    $waitingItem = cancellationPreorderItem($waitingOrder, $variant, OrderItem::PREORDER_STATUS_WAITING, 2);

    expect($waitingItem->fresh()->preorder_status)->toBe(OrderItem::PREORDER_STATUS_WAITING);

    cancellationRun($blockingOrder, cancellationCashier());

    expect($waitingItem->fresh()->preorder_status)->toBe(OrderItem::PREORDER_STATUS_READY)
        ->and(cancellationReserved($variant))->toBe(2);
});

test('a cancelled preorder gives its early bird slots back', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(0, 0);

    $variant->product->forceFill([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_early_bird_slots' => 5,
        'preorder_early_bird_discount_percent' => 10,
    ])->save();

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'payment_status' => Order::PAYMENT_PENDING,
        'order_type' => Order::TYPE_PREORDER,
    ]);
    $order->items()->delete();
    cancellationPreorderItem($order, $variant, OrderItem::PREORDER_STATUS_WAITING, 2, [
        'early_bird_applied' => true,
    ]);

    $remaining = function () use ($studentUser): int {
        $slots = null;

        test()->actingAs($studentUser)
            ->get('/student/dashboard')
            ->assertOk()
            ->assertInertia(function ($page) use (&$slots) {
                $slots = $page->toArray()['props']['comingSoonProducts'][0]['early_bird']['remaining_slots'];
            });

        return $slots;
    };

    expect($remaining())->toBe(3);

    cancellationRun($order, cancellationCashier());

    expect($remaining())->toBe(5);
});
