<?php

use App\Models\Order;
use App\Models\OrderItem;
use Laravel\Sanctum\Sanctum;

/**
 * An unpaid order whose every item is a preorder that expired.
 */
function expiredPreorderOrder($studentUser, array $itemStatuses = [OrderItem::PREORDER_STATUS_EXPIRED]): Order
{
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, makeVariantWithStock(10, 0), 1, [
        'order_type' => Order::TYPE_PREORDER,
        'payment_status' => Order::PAYMENT_PENDING,
        'payment_method' => null,
        'paid_at' => null,
        'release_qr_token' => null,
    ]);

    $first = true;

    foreach ($itemStatuses as $status) {
        if ($first) {
            $order->items()->update([
                'item_type' => OrderItem::TYPE_PREORDER,
                'preorder_status' => $status,
            ]);
            $first = false;

            continue;
        }

        $order->items()->create([
            'product_variant_id' => $order->items->first()->product_variant_id,
            'product_code' => 'PRD-CODE',
            'product_name' => 'Second Product',
            'variant_name' => 'Standard',
            'sku' => 'SKU-2',
            'item_type' => OrderItem::TYPE_PREORDER,
            'preorder_status' => $status,
            'quantity' => 1,
            'unit_price' => '100.00',
            'line_total' => '100.00',
        ]);
    }

    return $order->fresh('items');
}

test('an order whose preorder items all expired is recognised as expired', function () {
    $studentUser = makeStudentAccount();

    $expired = expiredPreorderOrder($studentUser);
    $twoExpired = expiredPreorderOrder($studentUser, [OrderItem::PREORDER_STATUS_EXPIRED, OrderItem::PREORDER_STATUS_EXPIRED]);
    $oneStillWaiting = expiredPreorderOrder($studentUser, [OrderItem::PREORDER_STATUS_EXPIRED, OrderItem::PREORDER_STATUS_WAITING]);
    $waiting = expiredPreorderOrder($studentUser, [OrderItem::PREORDER_STATUS_WAITING]);
    $normal = makePaidOrderWithItem($studentUser->student, $studentUser, makeVariantWithStock(10, 2), 1, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);

    expect($expired->hasOnlyExpiredPreorders())->toBeTrue()
        ->and($twoExpired->hasOnlyExpiredPreorders())->toBeTrue()
        ->and($oneStillWaiting->hasOnlyExpiredPreorders())->toBeFalse()
        ->and($waiting->hasOnlyExpiredPreorders())->toBeFalse()
        ->and($normal->hasOnlyExpiredPreorders())->toBeFalse();
});

test('a student cannot cancel an order that only holds expired preorders', function () {
    $studentUser = makeStudentAccount();
    $order = expiredPreorderOrder($studentUser);

    expect($order->studentCancelBlockedReason())->toBe('This preorder has expired.');

    $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/cancel")
        ->assertSessionHasErrors(['order' => 'This preorder has expired.']);

    expect($order->fresh()->isCancelled())->toBeFalse();
});

test('the website order page says the cancel option is closed for an expired preorder', function () {
    $studentUser = makeStudentAccount();
    $order = expiredPreorderOrder($studentUser);

    $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}")
        ->assertInertia(fn ($page) => $page
            ->where('order.cancel_blocked_reason', 'This preorder has expired.')
            ->where('order.items.0.preorder_status', 'expired'),
        );
});

test('the website orders list flags expired preorder orders and leaves them out of pending payment', function () {
    $studentUser = makeStudentAccount();
    $expired = expiredPreorderOrder($studentUser);
    $normal = makePaidOrderWithItem($studentUser->student, $studentUser, makeVariantWithStock(10, 2), 1, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);

    $this->actingAs($studentUser)
        ->get('/student/orders')
        ->assertInertia(fn ($page) => $page
            ->component('student/Orders/Index')
            ->where('orderSummary.pending_payment', 1)
            ->where('orders', function ($orders) use ($expired, $normal) {
                $flags = collect($orders)->pluck('is_expired_preorder', 'id');

                return $flags->count() === 2
                    && $flags[$expired->id] === true
                    && $flags[$normal->id] === false;
            }),
        );
});

test('the mobile order shows as expired with no qr and no cancel option', function () {
    $studentUser = makeStudentAccount();
    $order = expiredPreorderOrder($studentUser);

    Sanctum::actingAs($studentUser, ['student']);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertOk()
        ->assertJsonPath('data.status.key', 'expired')
        ->assertJsonPath('data.status.label', 'Expired')
        ->assertJsonPath('data.status.description', 'The payment period for this preorder has expired.')
        ->assertJsonPath('data.qr.kind', null)
        ->assertJsonPath('data.qr.message', 'This preorder has expired.')
        ->assertJsonPath('data.can_cancel', false)
        ->assertJsonPath('data.cancel_blocked_reason', 'This preorder has expired.');

    $this->getJson("/api/v1/orders/{$order->id}/qr")->assertNotFound();

    $this->getJson('/api/v1/orders')
        ->assertJsonPath('data.0.status.key', 'expired');

    $this->postJson("/api/v1/orders/{$order->id}/cancel")
        ->assertUnprocessable()
        ->assertJsonPath('errors.order.0', 'This preorder has expired.');
});

test('an order with an expired and a waiting preorder keeps its waiting status', function () {
    $studentUser = makeStudentAccount();
    $order = expiredPreorderOrder($studentUser, [OrderItem::PREORDER_STATUS_EXPIRED, OrderItem::PREORDER_STATUS_WAITING]);

    Sanctum::actingAs($studentUser, ['student']);

    $this->getJson("/api/v1/orders/{$order->id}")
        ->assertJsonPath('data.status.key', 'waiting_for_stock');
});
