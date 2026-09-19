<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Services\OrderCancellationService;

function screensUnpaidOrder($studentUser, $variant, array $overrides = []): Order
{
    return makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, array_merge([
        'payment_status' => Order::PAYMENT_PENDING,
        'paid_at' => null,
    ], $overrides));
}

function screensStaff(string $role): User
{
    return User::factory()->create(['role' => $role, 'is_active' => true]);
}

test('the student order page tells the student until when they can cancel', function () {
    $studentUser = makeStudentAccount();
    $order = screensUnpaidOrder($studentUser, makeVariantWithStock(10, 2));

    $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('student/Orders/Show')
            ->where('order.cancel_blocked_reason', null)
            ->where('order.cancel_url', "/student/orders/{$order->id}/cancel")
            ->whereNot('order.cancel_until', null)
            ->where('order.cancellation', null),
        );
});

test('the student order page explains why cancelling is no longer possible', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);

    $late = screensUnpaidOrder($studentUser, $variant);
    Order::query()->whereKey($late->id)->update(['created_at' => now()->subHours(30)]);

    $paid = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1);

    $this->actingAs($studentUser)
        ->get("/student/orders/{$late->id}")
        ->assertInertia(fn ($page) => $page
            ->where('order.cancel_blocked_reason', 'The 24-hour cancellation period has ended. Please see the cashier.'),
        );

    $this->actingAs($studentUser)
        ->get("/student/orders/{$paid->id}")
        ->assertInertia(fn ($page) => $page
            ->where('order.cancel_blocked_reason', fn ($reason) => str_contains($reason, 'already paid')),
        );
});

test('a cancelled order shows who cancelled it and why on every order page', function () {
    $studentUser = makeStudentAccount();
    $cashier = screensStaff('cashier');
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2);

    app(OrderCancellationService::class)->cancel(
        request(),
        $order,
        $cashier,
        Order::CANCEL_REASON_WRONG_ITEM,
        'Wrong size picked.',
        true,
    );

    $expected = fn ($page) => $page
        ->where('order.cancellation.reason', 'Wrong item ordered')
        ->where('order.cancellation.note', 'Wrong size picked.')
        ->where('order.cancellation.cancelled_by', $cashier->name)
        ->whereNot('order.cancellation.refunded_at', null);

    $this->actingAs($studentUser)->get("/student/orders/{$order->id}")->assertInertia($expected);
    $this->actingAs($cashier)->get("/cashier/orders/{$order->id}")->assertInertia($expected);
    $this->actingAs(screensStaff('admin'))->get("/admin/orders/{$order->id}")->assertInertia($expected);
});

test('cashier and admin order pages only offer cancel while it is still possible', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $open = screensUnpaidOrder($studentUser, $variant);
    $released = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now(),
    ]);

    $cashier = screensStaff('cashier');
    $admin = screensStaff('admin');

    $this->actingAs($cashier)->get("/cashier/orders/{$open->id}")
        ->assertInertia(fn ($page) => $page
            ->where('order.can_cancel', true)
            ->where('order.cancel_url', "/cashier/orders/{$open->id}/cancel"));

    $this->actingAs($admin)->get("/admin/orders/{$open->id}")
        ->assertInertia(fn ($page) => $page
            ->where('order.can_cancel', true)
            ->where('order.cancel_url', "/admin/orders/{$open->id}/cancel"));

    $this->actingAs($cashier)->get("/cashier/orders/{$released->id}")
        ->assertInertia(fn ($page) => $page->where('order.can_cancel', false));

    $this->actingAs($admin)->get("/admin/orders/{$released->id}")
        ->assertInertia(fn ($page) => $page->where('order.can_cancel', false));
});

test('a refunded order still appears in the admin order list', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2);

    app(OrderCancellationService::class)->cancel(
        request(),
        $order,
        screensStaff('cashier'),
        Order::CANCEL_REASON_STUDENT_REQUEST,
        null,
        true,
    );

    $this->actingAs(screensStaff('admin'))
        ->get('/admin/orders?status=cancelled')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('orders.data.0.payment_status', Order::PAYMENT_REFUNDED));
});

test('a cancelled preorder appears on the student preorders page as cancelled', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);

    $order = screensUnpaidOrder($studentUser, $variant, ['order_type' => Order::TYPE_PREORDER]);
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

    app(OrderCancellationService::class)->cancel(
        request(),
        $order,
        $studentUser,
        Order::CANCEL_REASON_STUDENT_REQUEST,
    );

    $this->actingAs($studentUser)
        ->get('/student/preorders')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('preorders.0.preorder_status', OrderItem::PREORDER_STATUS_CANCELLED));
});
