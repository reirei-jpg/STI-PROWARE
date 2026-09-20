<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function apiOrderAs(User $student): void
{
    Sanctum::actingAs($student, ['student']);
}

function apiOrderUnpaid(User $student, $variant, array $overrides = []): Order
{
    return makePaidOrderWithItem($student->student, $student, $variant, 2, array_merge([
        'payment_status' => Order::PAYMENT_PENDING,
        'paid_at' => null,
        'release_qr_token' => null,
    ], $overrides));
}

function apiOrderPreorder(User $student, string $preorderStatus): Order
{
    $order = apiOrderUnpaid($student, makeVariantWithStock(10, 0), [
        'order_type' => Order::TYPE_PREORDER,
        'payment_method' => null,
    ]);

    $order->items()->update([
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => $preorderStatus,
    ]);

    return $order->fresh('items');
}

function apiOrderIsPng(string $content): bool
{
    return str_starts_with($content, "\x89PNG");
}

test('the order endpoints need a signed-in student', function () {
    $this->getJson('/api/v1/orders')->assertUnauthorized();
    $this->getJson('/api/v1/orders/1')->assertUnauthorized();
    $this->getJson('/api/v1/orders/1/qr')->assertUnauthorized();
    $this->postJson('/api/v1/orders/1/cancel')->assertUnauthorized();

    Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]), ['student']);

    $this->getJson('/api/v1/orders')->assertUnauthorized();
});

test('a student sees only their own orders, newest first', function () {
    $student = makeStudentAccount();
    $older = apiOrderUnpaid($student, makeVariantWithStock(10, 2));
    Order::query()->whereKey($older->id)->update(['created_at' => now()->subHour()]);
    $newer = apiOrderUnpaid($student, makeVariantWithStock(10, 2));

    $stranger = makeStudentAccount();
    apiOrderUnpaid($stranger, makeVariantWithStock(10, 2));

    apiOrderAs($student);

    $this->getJson('/api/v1/orders')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonPath('data.0.order_number', $newer->order_number)
        ->assertJsonPath('data.0.status.key', 'pending_payment')
        ->assertJsonPath('data.0.status.label', 'Pending Payment')
        ->assertJsonPath('data.0.total', '200.00')
        ->assertJsonPath('data.0.total_quantity', 2)
        ->assertJsonPath('data.0.preview_item.product_name', 'Test Product')
        ->assertJsonPath('data.0.additional_items_count', 0);
});

test('a student with no orders gets an empty list', function () {
    apiOrderAs(makeStudentAccount());

    $this->getJson('/api/v1/orders')->assertOk()->assertJsonPath('data', []);
});

test('an unpaid order shows the payment qr and when it can still be cancelled', function () {
    $student = makeStudentAccount();
    $order = apiOrderUnpaid($student, makeVariantWithStock(10, 2));
    apiOrderAs($student);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertOk()
        ->assertJsonPath('data.status.key', 'pending_payment')
        ->assertJsonPath('data.payment_method', 'cash')
        ->assertJsonPath('data.qr.kind', 'payment')
        ->assertJsonPath('data.qr.title', 'Show QR to Cashier')
        ->assertJsonPath('data.can_cancel', true)
        ->assertJsonPath('data.cancel_blocked_reason', null)
        ->assertJsonPath('data.cancellation', null)
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.quantity', 2)
        ->assertJsonPath('data.items.0.unit_price', '100.00')
        ->assertJsonPath('data.items.0.line_total', '200.00')
        ->assertJsonMissingPath('data.qr_token')
        ->assertJsonMissingPath('data.release_qr_token');
});

test('the order page shows times in Manila time', function () {
    $student = makeStudentAccount();
    $order = apiOrderUnpaid($student, makeVariantWithStock(10, 2));
    Order::query()->whereKey($order->id)->update(['created_at' => '2026-09-01 00:30:00']);
    apiOrderAs($student);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertJsonPath('data.created_at', 'Sep 01, 2026 08:30 AM');
});

test('a paid order shows the release qr and no cancel option', function () {
    $student = makeStudentAccount();
    $order = makePaidOrderWithItem($student->student, $student, makeVariantWithStock(10, 2), 1);
    apiOrderAs($student);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertOk()
        ->assertJsonPath('data.status.key', 'payment_confirmed')
        ->assertJsonPath('data.qr.kind', 'release')
        ->assertJsonPath('data.qr.title', 'Show QR to PROWARE Specialist')
        ->assertJsonPath('data.can_cancel', false)
        ->assertJsonPath('data.cancel_blocked_reason', 'This order is already paid. Please see the cashier if you need to cancel it.');
});

test('a used release qr and a released order show no qr', function () {
    $student = makeStudentAccount();
    $used = makePaidOrderWithItem($student->student, $student, makeVariantWithStock(10, 2), 1, [
        'release_qr_used_at' => now(),
        'fulfillment_status' => Order::FULFILLMENT_PREPARING,
    ]);
    $released = makePaidOrderWithItem($student->student, $student, makeVariantWithStock(10, 2), 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now(),
    ]);
    apiOrderAs($student);

    $this->getJson("/api/v1/orders/{$used->id}")
        ->assertJsonPath('data.status.key', 'preparing')
        ->assertJsonPath('data.qr.kind', null)
        ->assertJsonPath('data.qr.message', 'This Release QR has already been used.');

    $this->getJson("/api/v1/orders/{$released->id}")
        ->assertJsonPath('data.status.key', 'released')
        ->assertJsonPath('data.qr.kind', null)
        ->assertJsonPath('data.qr.message', 'This order has already been released.');
});

test('a preorder waiting for stock shows no qr', function () {
    $student = makeStudentAccount();
    $order = apiOrderPreorder($student, OrderItem::PREORDER_STATUS_WAITING);
    apiOrderAs($student);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertOk()
        ->assertJsonPath('data.status.key', 'waiting_for_stock')
        ->assertJsonPath('data.qr.kind', null)
        ->assertJsonPath('data.items.0.item_type', 'preorder')
        ->assertJsonPath('data.items.0.preorder_status', 'waiting');

    $this->get("/api/v1/orders/{$order->id}/qr", ['Accept' => 'application/json'])->assertNotFound();
});

test('a ready preorder still needs its payment method before a qr shows', function () {
    $student = makeStudentAccount();
    $order = apiOrderPreorder($student, OrderItem::PREORDER_STATUS_READY);
    apiOrderAs($student);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertJsonPath('data.status.key', 'ready_for_payment')
        ->assertJsonPath('data.qr.kind', null)
        ->assertJsonPath('data.qr.message', 'Your preorder merchandise is now available. Choose how you will pay to continue.');
});

test('a student cannot open another students order', function () {
    $owner = makeStudentAccount();
    $order = apiOrderUnpaid($owner, makeVariantWithStock(10, 2));

    apiOrderAs(makeStudentAccount());

    $this->getJson("/api/v1/orders/{$order->id}")->assertForbidden();
    $this->getJson("/api/v1/orders/{$order->id}/qr")->assertForbidden();
    $this->postJson("/api/v1/orders/{$order->id}/cancel")->assertForbidden();

    expect($order->fresh()->isCancelled())->toBeFalse();
});

test('the qr image is a png for an unpaid and a paid order', function () {
    $student = makeStudentAccount();
    $unpaid = apiOrderUnpaid($student, makeVariantWithStock(10, 2));
    $paid = makePaidOrderWithItem($student->student, $student, makeVariantWithStock(10, 2), 1);
    apiOrderAs($student);

    foreach ([$unpaid, $paid] as $order) {
        $response = $this->get("/api/v1/orders/{$order->id}/qr");

        $response->assertOk();
        expect($response->headers->get('Content-Type'))->toBe('image/png')
            ->and(apiOrderIsPng($response->getContent()))->toBeTrue();
    }
});

test('there is no qr image for a cancelled order', function () {
    $student = makeStudentAccount();
    $order = apiOrderUnpaid($student, makeVariantWithStock(10, 2));
    apiOrderAs($student);

    $this->postJson("/api/v1/orders/{$order->id}/cancel")->assertOk();

    $this->get("/api/v1/orders/{$order->id}/qr", ['Accept' => 'application/json'])->assertNotFound();
});

test('a student can cancel an unpaid order and the stock is given back', function () {
    $student = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = apiOrderUnpaid($student, $variant);
    apiOrderAs($student);

    $this->postJson("/api/v1/orders/{$order->id}/cancel", ['note' => 'Changed my mind.'])
        ->assertOk()
        ->assertJsonPath('message', "Order {$order->order_number} has been cancelled.")
        ->assertJsonPath('data.status.key', 'cancelled')
        ->assertJsonPath('data.qr.kind', null)
        ->assertJsonPath('data.can_cancel', false)
        ->assertJsonPath('data.cancellation.reason', 'Student asked to cancel')
        ->assertJsonPath('data.cancellation.note', 'Changed my mind.');

    expect($order->fresh()->isCancelled())->toBeTrue()
        ->and($variant->inventory->fresh()->quantity_reserved)->toBe(0);
});

test('cancelling uses the website messages when it is no longer allowed', function () {
    $student = makeStudentAccount();
    $variant = makeVariantWithStock(10, 4);
    $late = apiOrderUnpaid($student, $variant);
    Order::query()->whereKey($late->id)->update(['created_at' => now()->subHours(30)]);
    $paid = makePaidOrderWithItem($student->student, $student, $variant, 1);
    apiOrderAs($student);

    $this->postJson("/api/v1/orders/{$late->id}/cancel")
        ->assertUnprocessable()
        ->assertJsonPath('errors.order.0', 'The 24-hour cancellation period has ended. Please see the cashier.');

    $this->postJson("/api/v1/orders/{$paid->id}/cancel")
        ->assertUnprocessable()
        ->assertJsonPath('errors.order.0', 'This order is already paid. Please see the cashier if you need to cancel it.');

    $this->postJson("/api/v1/orders/{$late->id}/cancel", ['note' => str_repeat('a', 501)])
        ->assertUnprocessable();

    expect($late->fresh()->isCancelled())->toBeFalse()
        ->and($paid->fresh()->isCancelled())->toBeFalse();
});

test('an order cannot be cancelled twice', function () {
    $student = makeStudentAccount();
    $order = apiOrderUnpaid($student, makeVariantWithStock(10, 2));
    apiOrderAs($student);

    $this->postJson("/api/v1/orders/{$order->id}/cancel")->assertOk();

    $this->postJson("/api/v1/orders/{$order->id}/cancel")
        ->assertUnprocessable()
        ->assertJsonPath('errors.order.0', 'This order has already been cancelled.');
});
