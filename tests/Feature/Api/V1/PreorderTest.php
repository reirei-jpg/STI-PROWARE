<?php

use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function apiPreorderAs(User $student): void
{
    Sanctum::actingAs($student, ['student']);
}

function apiPreorderOrder(User $student, string $preorderStatus, array $itemOverrides = []): Order
{
    $order = makePaidOrderWithItem($student->student, $student, makeVariantWithStock(10, 0), 2, [
        'order_type' => Order::TYPE_PREORDER,
        'payment_status' => Order::PAYMENT_PENDING,
        'payment_method' => null,
        'paid_at' => null,
        'release_qr_token' => null,
    ]);

    $order->items()->update(array_merge([
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => $preorderStatus,
        'preorder_ready_at' => $preorderStatus === OrderItem::PREORDER_STATUS_READY ? now() : null,
        'preorder_payment_deadline_at' => $preorderStatus === OrderItem::PREORDER_STATUS_READY
            ? '2026-09-10 04:00:00'
            : null,
    ], $itemOverrides));

    return $order->fresh('items');
}

test('the preorder endpoints need a signed-in student', function () {
    $this->getJson('/api/v1/preorders')->assertUnauthorized();
    $this->postJson('/api/v1/orders/1/payment', [])->assertUnauthorized();

    Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]), ['student']);

    $this->getJson('/api/v1/preorders')->assertUnauthorized();
});

test('a student with no preorders gets an empty list', function () {
    apiPreorderAs(makeStudentAccount());

    $this->getJson('/api/v1/preorders')->assertOk()->assertJsonPath('data', []);
});

test('the preorder list shows only the students own preorder items', function () {
    $student = makeStudentAccount();
    $waiting = apiPreorderOrder($student, OrderItem::PREORDER_STATUS_WAITING);
    $normal = makePaidOrderWithItem($student->student, $student, makeVariantWithStock(10, 2), 1);

    apiPreorderOrder(makeStudentAccount(), OrderItem::PREORDER_STATUS_WAITING);

    apiPreorderAs($student);

    $this->getJson('/api/v1/preorders')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.order_id', $waiting->id)
        ->assertJsonPath('data.0.order_number', $waiting->order_number)
        ->assertJsonPath('data.0.status.key', 'waiting')
        ->assertJsonPath('data.0.status.label', 'Waiting for Stock')
        ->assertJsonPath('data.0.awaiting_payment_method', false)
        ->assertJsonPath('data.0.quantity', 2)
        ->assertJsonPath('data.0.product_name', 'Test Product');

    expect($normal->id)->not->toBe($waiting->id);
});

test('a ready preorder shows its deadline in Manila time and that a payment method is needed', function () {
    $student = makeStudentAccount();
    apiPreorderOrder($student, OrderItem::PREORDER_STATUS_READY);
    apiPreorderAs($student);

    $this->getJson('/api/v1/preorders')
        ->assertJsonPath('data.0.status.key', 'ready')
        ->assertJsonPath('data.0.status.label', 'Ready for Payment')
        ->assertJsonPath('data.0.awaiting_payment_method', true)
        ->assertJsonPath('data.0.preorder_payment_deadline_at', 'Sep 10, 2026 12:00 PM');
});

test('every preorder status has the websites wording', function () {
    $student = makeStudentAccount();

    foreach ([
        OrderItem::PREORDER_STATUS_PAID => ['paid', 'Paid'],
        OrderItem::PREORDER_STATUS_EXPIRED => ['expired', 'Expired'],
        OrderItem::PREORDER_STATUS_CANCELLED => ['cancelled', 'Cancelled'],
    ] as $status => [$key, $label]) {
        apiPreorderOrder($student, $status);
    }

    apiPreorderAs($student);

    $labels = collect($this->getJson('/api/v1/preorders')->assertOk()->json('data'))
        ->pluck('status.label', 'status.key')
        ->all();

    expect($labels)->toBe([
        'cancelled' => 'Cancelled',
        'expired' => 'Expired',
        'paid' => 'Paid',
    ]);
});

test('the order page says a ready preorder still needs a payment method and how much is due', function () {
    $student = makeStudentAccount();
    $order = apiPreorderOrder($student, OrderItem::PREORDER_STATUS_READY);
    apiPreorderAs($student);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertJsonPath('data.payment_method_needed', true)
        ->assertJsonPath('data.payment_due_total', '200.00');

    $order->forceFill(['payment_method' => 'cash'])->save();

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertJsonPath('data.payment_method_needed', false);
});

test('a waiting preorder does not need a payment method', function () {
    $student = makeStudentAccount();
    $order = apiPreorderOrder($student, OrderItem::PREORDER_STATUS_WAITING);
    apiPreorderAs($student);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertJsonPath('data.payment_method_needed', false)
        ->assertJsonPath('data.payment_due_total', '0.00');
});

test('a student can submit cash for a ready preorder and the cashiers are told', function () {
    $cashier = User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]);
    $student = makeStudentAccount();
    $order = apiPreorderOrder($student, OrderItem::PREORDER_STATUS_READY);
    apiPreorderAs($student);

    $this->postJson("/api/v1/orders/{$order->id}/payment", ['payment_method' => 'cash'])
        ->assertOk()
        ->assertJsonPath('message', 'Payment method submitted. Show your Payment QR to the cashier to complete payment.')
        ->assertJsonPath('data.payment_method', 'cash')
        ->assertJsonPath('data.payment_method_needed', false)
        ->assertJsonPath('data.qr.kind', 'payment');

    expect($order->fresh()->payment_method)->toBe('cash')
        ->and($order->fresh()->payment_status)->toBe(Order::PAYMENT_PENDING)
        ->and(Notification::query()
            ->where('user_id', $cashier->id)
            ->where('type', Notification::TYPE_ORDER_PENDING_PAYMENT)
            ->exists())->toBeTrue();
});

test('a gcash payment for a ready preorder keeps the reference in capital letters', function () {
    $student = makeStudentAccount();
    $order = apiPreorderOrder($student, OrderItem::PREORDER_STATUS_READY);
    apiPreorderAs($student);

    $this->postJson("/api/v1/orders/{$order->id}/payment", [
        'payment_method' => 'gcash',
        'payment_reference' => ' gc-lowercase-ref ',
    ])->assertOk();

    expect($order->fresh()->payment_method)->toBe('gcash')
        ->and($order->fresh()->payment_reference)->toBe('GC-LOWERCASE-REF');
});

test('a preorder payment uses the website messages for a missing reference', function () {
    $student = makeStudentAccount();
    $order = apiPreorderOrder($student, OrderItem::PREORDER_STATUS_READY);
    apiPreorderAs($student);

    $this->postJson("/api/v1/orders/{$order->id}/payment", ['payment_method' => 'maya'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.payment_reference.0', 'The transaction/reference number is required for GCash or Maya.');

    $this->postJson("/api/v1/orders/{$order->id}/payment", ['payment_method' => 'paypal'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.payment_method.0', 'The selected payment method is invalid.');

    expect($order->fresh()->payment_method)->toBeNull();
});

test('a reference already used for another order is refused for a preorder too', function () {
    $student = makeStudentAccount();
    makePaidOrderWithItem($student->student, $student, makeVariantWithStock(10, 2), 1, [
        'payment_reference' => 'ABC123XYZ',
    ]);
    $order = apiPreorderOrder($student, OrderItem::PREORDER_STATUS_READY);
    apiPreorderAs($student);

    $this->postJson("/api/v1/orders/{$order->id}/payment", [
        'payment_method' => 'gcash',
        'payment_reference' => 'abc123xyz',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.payment_reference.0', 'This transaction/reference number has already been used for another order.');

    expect($order->fresh()->payment_method)->toBeNull();
});

test('a preorder payment cannot be submitted twice or before the preorder is ready', function () {
    $student = makeStudentAccount();
    $ready = apiPreorderOrder($student, OrderItem::PREORDER_STATUS_READY);
    $waiting = apiPreorderOrder($student, OrderItem::PREORDER_STATUS_WAITING);
    apiPreorderAs($student);

    $this->postJson("/api/v1/orders/{$ready->id}/payment", ['payment_method' => 'cash'])->assertOk();

    $this->postJson("/api/v1/orders/{$ready->id}/payment", [
        'payment_method' => 'gcash',
        'payment_reference' => 'SECONDATTEMPT1',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.order.0', 'This preorder is not currently awaiting a payment method.');

    $this->postJson("/api/v1/orders/{$waiting->id}/payment", ['payment_method' => 'cash'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.order.0', 'This preorder is not currently awaiting a payment method.');

    expect($ready->fresh()->payment_method)->toBe('cash')
        ->and($waiting->fresh()->payment_method)->toBeNull();
});

test('a student cannot submit payment for another students preorder', function () {
    $owner = makeStudentAccount();
    $order = apiPreorderOrder($owner, OrderItem::PREORDER_STATUS_READY);

    apiPreorderAs(makeStudentAccount());

    $this->postJson("/api/v1/orders/{$order->id}/payment", ['payment_method' => 'cash'])->assertForbidden();

    expect($order->fresh()->payment_method)->toBeNull();
});
