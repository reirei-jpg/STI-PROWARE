<?php

use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;

function accessUnpaidOrder($studentUser, $variant, int $quantity = 2, array $overrides = []): Order
{
    return makePaidOrderWithItem($studentUser->student, $studentUser, $variant, $quantity, array_merge([
        'payment_status' => Order::PAYMENT_PENDING,
        'paid_at' => null,
    ], $overrides));
}

function accessAge(Order $order, int $hours): void
{
    Order::query()->whereKey($order->id)->update([
        'created_at' => now()->subHours($hours),
    ]);
}

function accessReserved($variant): int
{
    return (int) Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->value('quantity_reserved');
}

function accessPreorderItem(Order $order, $variant, string $status, array $extra = []): OrderItem
{
    return $order->items()->create(array_merge([
        'product_variant_id' => $variant->id,
        'product_code' => 'PRD-CODE',
        'product_name' => 'Test Product',
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => $status,
        'preorder_reserved_quantity' => $status === OrderItem::PREORDER_STATUS_READY ? 2 : 0,
        'quantity' => 2,
        'unit_price' => '100.00',
        'line_total' => '200.00',
    ], $extra));
}

function accessStaff(string $role): User
{
    return User::factory()->create(['role' => $role, 'is_active' => true]);
}

/*
|--------------------------------------------------------------------------
| Student cancelling their own order
|--------------------------------------------------------------------------
*/

test('a student can cancel their own unpaid order within 24 hours', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = accessUnpaidOrder($studentUser, $variant);
    accessAge($order, 23);

    $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/cancel", ['note' => 'Changed my mind.'])
        ->assertRedirect("/student/orders/{$order->id}")
        ->assertSessionHasNoErrors();

    $order->refresh();

    expect($order->isCancelled())->toBeTrue()
        ->and($order->cancelled_by)->toBe($studentUser->id)
        ->and($order->cancellation_reason)->toBe(Order::CANCEL_REASON_STUDENT_REQUEST)
        ->and($order->cancellation_note)->toBe('Changed my mind.')
        ->and(accessReserved($variant))->toBe(0);
});

test('a student cannot cancel once the 24 hour limit has passed', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = accessUnpaidOrder($studentUser, $variant);
    accessAge($order, 25);

    $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/cancel")
        ->assertSessionHasErrors('order');

    expect($order->fresh()->isCancelled())->toBeFalse()
        ->and(accessReserved($variant))->toBe(2);
});

test('a student cannot cancel an order that is already paid', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2);

    $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/cancel")
        ->assertSessionHasErrors('order');

    expect($order->fresh()->payment_status)->toBe(Order::PAYMENT_PAID)
        ->and($order->fresh()->isCancelled())->toBeFalse();
});

test('a student cannot cancel someone elses order', function () {
    $owner = makeStudentAccount();
    $intruder = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = accessUnpaidOrder($owner, $variant);

    $this->actingAs($intruder)
        ->post("/student/orders/{$order->id}/cancel")
        ->assertForbidden();

    expect($order->fresh()->isCancelled())->toBeFalse();
});

test('a student note that is too long is rejected', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = accessUnpaidOrder($studentUser, $variant);

    $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/cancel", ['note' => str_repeat('a', 501)])
        ->assertSessionHasErrors('note');

    expect($order->fresh()->isCancelled())->toBeFalse();
});

test('a preorder still waiting for stock can be cancelled by the student at any time', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);
    $order = accessUnpaidOrder($studentUser, $variant, 1, ['order_type' => Order::TYPE_PREORDER]);
    $order->items()->delete();
    accessPreorderItem($order, $variant, OrderItem::PREORDER_STATUS_WAITING);
    accessAge($order, 24 * 10);

    $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/cancel")
        ->assertSessionHasNoErrors();

    expect($order->fresh()->isCancelled())->toBeTrue();
});

test('a ready preorder gives the student 24 hours from when stock was reserved', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);

    $recent = accessUnpaidOrder($studentUser, $variant, 1, ['order_type' => Order::TYPE_PREORDER]);
    $recent->items()->delete();
    accessPreorderItem($recent, $variant, OrderItem::PREORDER_STATUS_READY, [
        'preorder_ready_at' => now()->subHours(2),
    ]);
    accessAge($recent, 24 * 10);

    $stale = accessUnpaidOrder($studentUser, $variant, 1, ['order_type' => Order::TYPE_PREORDER]);
    $stale->items()->delete();
    accessPreorderItem($stale, $variant, OrderItem::PREORDER_STATUS_READY, [
        'preorder_ready_at' => now()->subHours(30),
    ]);

    $this->actingAs($studentUser)
        ->post("/student/orders/{$stale->id}/cancel")
        ->assertSessionHasErrors('order');

    $this->actingAs($studentUser)
        ->post("/student/orders/{$recent->id}/cancel")
        ->assertSessionHasNoErrors();

    expect($stale->fresh()->isCancelled())->toBeFalse()
        ->and($recent->fresh()->isCancelled())->toBeTrue();
});

test('an order with a normal item is limited to 24 hours even if it also has a waiting preorder', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = accessUnpaidOrder($studentUser, $variant, 2, ['order_type' => Order::TYPE_MIXED]);
    accessPreorderItem($order, $variant, OrderItem::PREORDER_STATUS_WAITING);
    accessAge($order, 30);

    $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/cancel")
        ->assertSessionHasErrors('order');

    expect($order->fresh()->isCancelled())->toBeFalse();
});

test('only students can use the student cancel route', function (string $role) {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = accessUnpaidOrder($studentUser, $variant);

    $this->actingAs(accessStaff($role))
        ->post("/student/orders/{$order->id}/cancel")
        ->assertForbidden();

    expect($order->fresh()->isCancelled())->toBeFalse();
})->with(['cashier', 'specialist', 'admin', 'super_admin']);

/*
|--------------------------------------------------------------------------
| Staff cancelling
|--------------------------------------------------------------------------
*/

test('staff can cancel an unpaid order long after the student limit', function (string $role, string $prefix) {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = accessUnpaidOrder($studentUser, $variant);
    accessAge($order, 24 * 10);

    $staff = accessStaff($role);

    $this->actingAs($staff)
        ->post("/{$prefix}/orders/{$order->id}/cancel", [
            'reason' => Order::CANCEL_REASON_NEVER_CLAIMED,
        ])
        ->assertSessionHasNoErrors();

    $order->refresh();

    expect($order->isCancelled())->toBeTrue()
        ->and($order->cancelled_by)->toBe($staff->id)
        ->and($order->cancellation_reason)->toBe(Order::CANCEL_REASON_NEVER_CLAIMED)
        ->and(accessReserved($variant))->toBe(0);
})->with([
    'cashier' => ['cashier', 'cashier'],
    'admin' => ['admin', 'admin'],
    'super admin' => ['super_admin', 'admin'],
]);

test('staff must confirm the refund to cancel a paid order', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2);
    $cashier = accessStaff('cashier');

    $this->actingAs($cashier)
        ->post("/cashier/orders/{$order->id}/cancel", [
            'reason' => Order::CANCEL_REASON_STUDENT_REQUEST,
        ])
        ->assertSessionHasErrors('refund_confirmed');

    expect($order->fresh()->payment_status)->toBe(Order::PAYMENT_PAID);

    $this->actingAs($cashier)
        ->post("/cashier/orders/{$order->id}/cancel", [
            'reason' => Order::CANCEL_REASON_STUDENT_REQUEST,
            'refund_confirmed' => true,
        ])
        ->assertSessionHasNoErrors();

    expect($order->fresh()->payment_status)->toBe(Order::PAYMENT_REFUNDED)
        ->and($order->fresh()->refund_confirmed_at)->not->toBeNull();
});

test('staff must give a valid reason and a note when the reason is other', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = accessUnpaidOrder($studentUser, $variant);
    $cashier = accessStaff('cashier');

    $this->actingAs($cashier)
        ->post("/cashier/orders/{$order->id}/cancel", [])
        ->assertSessionHasErrors('reason');

    $this->actingAs($cashier)
        ->post("/cashier/orders/{$order->id}/cancel", ['reason' => Order::CANCEL_REASON_UNPAID_EXPIRED])
        ->assertSessionHasErrors('reason');

    $this->actingAs($cashier)
        ->post("/cashier/orders/{$order->id}/cancel", ['reason' => Order::CANCEL_REASON_OTHER])
        ->assertSessionHasErrors('note');

    expect($order->fresh()->isCancelled())->toBeFalse();

    $this->actingAs($cashier)
        ->post("/cashier/orders/{$order->id}/cancel", [
            'reason' => Order::CANCEL_REASON_OTHER,
            'note' => 'Duplicate order.',
        ])
        ->assertSessionHasNoErrors();

    expect($order->fresh()->cancellation_note)->toBe('Duplicate order.');
});

test('staff cannot cancel an order that was already released', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now(),
    ]);

    $this->actingAs(accessStaff('admin'))
        ->post("/admin/orders/{$order->id}/cancel", [
            'reason' => Order::CANCEL_REASON_OTHER,
            'note' => 'Test',
            'refund_confirmed' => true,
        ])
        ->assertSessionHasErrors('order');

    expect($order->fresh()->fulfillment_status)->toBe(Order::FULFILLMENT_RELEASED);
});

test('specialists and students cannot use the staff cancel routes', function (string $role, string $prefix) {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = accessUnpaidOrder($studentUser, $variant);

    $user = $role === 'student' ? $studentUser : accessStaff($role);

    $this->actingAs($user)
        ->post("/{$prefix}/orders/{$order->id}/cancel", [
            'reason' => Order::CANCEL_REASON_OTHER,
            'note' => 'Test',
        ])
        ->assertForbidden();

    expect($order->fresh()->isCancelled())->toBeFalse();
})->with([
    'specialist on cashier' => ['specialist', 'cashier'],
    'specialist on admin' => ['specialist', 'admin'],
    'student on cashier' => ['student', 'cashier'],
    'student on admin' => ['student', 'admin'],
    'cashier on admin' => ['cashier', 'admin'],
]);
