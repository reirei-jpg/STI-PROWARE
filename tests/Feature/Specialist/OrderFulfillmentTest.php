<?php

use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Order;
use App\Models\StockMovement;

test('specialist cannot mark an order ready before the release qr is scanned', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'release_qr_used_at' => null,
    ]);

    $response = $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/ready");

    $response->assertSessionHasErrors('order');

    $order->refresh();

    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_PENDING);
});

test('specialist can mark a paid, qr-verified order ready for pickup', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'release_qr_used_at' => now(),
    ]);

    $response = $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/ready");

    $response->assertRedirect(route('specialist.orders.show', $order));

    $order->refresh();

    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_READY);
    expect($order->ready_for_release_at)->not->toBeNull();

    expect(
        Notification::query()
            ->where('user_id', $studentUser->id)
            ->where('type', Notification::TYPE_ORDER_READY_FOR_PICKUP)
            ->exists(),
    )->toBeTrue();
});

test('marking an already ready order ready again fails', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'release_qr_used_at' => now(),
        'fulfillment_status' => Order::FULFILLMENT_READY,
        'ready_for_release_at' => now(),
    ]);

    $response = $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/ready");

    $response->assertSessionHasErrors('order');
});

test('marking a cancelled order ready fails', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'release_qr_used_at' => now(),
        'payment_status' => Order::PAYMENT_CANCELLED,
        'cancelled_at' => now(),
    ]);

    $response = $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/ready");

    $response->assertSessionHasErrors('order');

    $order->refresh();

    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_PENDING);
});

test('a non-specialist cannot mark an order ready', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'release_qr_used_at' => now(),
    ]);

    $response = $this->actingAs($studentUser)
        ->patch("/specialist/orders/{$order->id}/ready");

    $response->assertForbidden();
});

test('release requires the order to be marked ready for pickup first', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'release_qr_used_at' => now(),
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
    ]);

    $response = $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/release");

    $response->assertSessionHasErrors('order');

    $order->refresh();

    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_PENDING);
});

test('specialist can release a ready order and inventory is deducted correctly', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 3);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 3, [
        'release_qr_used_at' => now(),
        'fulfillment_status' => Order::FULFILLMENT_READY,
        'ready_for_release_at' => now(),
    ]);

    $response = $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/release");

    $response->assertRedirect(route('specialist.orders.index'));

    $order->refresh();

    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_RELEASED);
    expect($order->released_at)->not->toBeNull();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect($inventory->quantity_on_hand)->toBe(7);
    expect($inventory->quantity_reserved)->toBe(0);

    $movement = StockMovement::query()
        ->where('product_variant_id', $variant->id)
        ->where('movement_type', StockMovement::TYPE_RELEASE)
        ->first();

    expect($movement)->not->toBeNull();
    expect($movement->quantity_change)->toBe(-3);
    expect($movement->quantity_before)->toBe(10);
    expect($movement->quantity_after)->toBe(7);

    expect(
        Notification::query()
            ->where('user_id', $studentUser->id)
            ->where('type', Notification::TYPE_ORDER_RELEASED)
            ->exists(),
    )->toBeTrue();
});

test('release fails when reserved stock is insufficient', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 1);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 3, [
        'release_qr_used_at' => now(),
        'fulfillment_status' => Order::FULFILLMENT_READY,
        'ready_for_release_at' => now(),
    ]);

    $response = $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/release");

    $response->assertSessionHasErrors('inventory');

    $order->refresh();

    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_READY);

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect($inventory->quantity_on_hand)->toBe(10);
    expect($inventory->quantity_reserved)->toBe(1);
});

test('release fails when physical stock is insufficient', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(2, 3);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 3, [
        'release_qr_used_at' => now(),
        'fulfillment_status' => Order::FULFILLMENT_READY,
        'ready_for_release_at' => now(),
    ]);

    $response = $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/release");

    $response->assertSessionHasErrors('inventory');

    $order->refresh();

    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_READY);
});

test('releasing an already released order fails', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 3);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 3, [
        'release_qr_used_at' => now(),
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now(),
    ]);

    $response = $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/release");

    $response->assertSessionHasErrors('order');
});

test('a non-specialist cannot release an order', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 3);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 3, [
        'release_qr_used_at' => now(),
        'fulfillment_status' => Order::FULFILLMENT_READY,
        'ready_for_release_at' => now(),
    ]);

    $response = $this->actingAs($studentUser)
        ->patch("/specialist/orders/{$order->id}/release");

    $response->assertForbidden();

    $order->refresh();

    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_READY);
});
