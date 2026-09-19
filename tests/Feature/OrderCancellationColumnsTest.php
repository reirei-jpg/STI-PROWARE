<?php

use App\Models\Order;
use App\Models\User;

test('an order stores who cancelled it, why, and whether a refund was confirmed', function () {
    $studentUser = makeStudentAccount();
    $cashier = User::factory()->create(['role' => 'cashier']);
    $variant = makeVariantWithStock(10, 1);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1);

    $order->forceFill([
        'fulfillment_status' => Order::FULFILLMENT_CANCELLED,
        'cancelled_at' => now(),
        'cancelled_by' => $cashier->id,
        'cancellation_reason' => 'student_request',
        'cancellation_note' => 'Ordered the wrong size.',
        'refund_confirmed_at' => now(),
    ])->save();

    $fresh = $order->fresh();

    expect($fresh->canceller->is($cashier))->toBeTrue()
        ->and($fresh->cancellation_reason)->toBe('student_request')
        ->and($fresh->cancellation_note)->toBe('Ordered the wrong size.')
        ->and($fresh->refund_confirmed_at)->not->toBeNull()
        ->and($fresh->isCancelled())->toBeTrue();
});

test('cancellation details stay empty on an ordinary order', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 1);

    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1)->fresh();

    expect($order->cancelled_by)->toBeNull()
        ->and($order->cancellation_reason)->toBeNull()
        ->and($order->refund_confirmed_at)->toBeNull();
});
