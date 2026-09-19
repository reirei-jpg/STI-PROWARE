<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderCancellationService;

function earlyBirdSetup(): array
{
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(0, 0);

    $variant->product->forceFill([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_early_bird_slots' => 5,
        'preorder_early_bird_discount_percent' => 10,
    ])->save();

    return [$studentUser, $variant];
}

function earlyBirdPaidPreorder($studentUser, $variant, int $quantity): Order
{
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'order_type' => Order::TYPE_PREORDER,
    ]);
    $order->items()->delete();

    // A paid preorder is promoted to a normal item by the cashier's payment step.
    $order->items()->create([
        'product_variant_id' => $variant->id,
        'product_code' => 'PRD-CODE',
        'product_name' => 'Test Product',
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_ORDER,
        'preorder_status' => OrderItem::PREORDER_STATUS_PAID,
        'early_bird_applied' => true,
        'quantity' => $quantity,
        'unit_price' => '100.00',
        'line_total' => (string) (100 * $quantity),
    ]);

    return $order;
}

function earlyBirdRemaining($studentUser): int
{
    $slots = null;

    test()->actingAs($studentUser)
        ->get('/student/dashboard')
        ->assertOk()
        ->assertInertia(function ($page) use (&$slots) {
            $slots = $page->toArray()['props']['comingSoonProducts'][0]['early_bird']['remaining_slots'];
        });

    return $slots;
}

test('a paid preorder still uses up its early bird slots', function () {
    [$studentUser, $variant] = earlyBirdSetup();

    earlyBirdPaidPreorder($studentUser, $variant, 2);

    expect(earlyBirdRemaining($studentUser))->toBe(3);
});

test('cancelling and refunding a paid preorder gives its early bird slots back', function () {
    [$studentUser, $variant] = earlyBirdSetup();

    $order = earlyBirdPaidPreorder($studentUser, $variant, 2);

    expect(earlyBirdRemaining($studentUser))->toBe(3);

    app(OrderCancellationService::class)->cancel(
        request(),
        $order,
        User::factory()->create(['role' => 'cashier', 'is_active' => true]),
        Order::CANCEL_REASON_STUDENT_REQUEST,
        null,
        true,
    );

    expect(earlyBirdRemaining($studentUser))->toBe(5);
});
