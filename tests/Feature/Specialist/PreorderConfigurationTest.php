<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;

function createSpecialistUser(): User
{
    return User::factory()->create([
        'role' => User::ROLE_SPECIALIST,
    ]);
}

/**
 * A new-merchandise purchase-order item already registered as a PROWARE
 * product and variant, ready for preorder configuration.
 */
function createNewMerchandisePurchaseOrderItem(
    User $admin,
    int $quantityOrdered = 10,
): PurchaseOrderItem {
    $purchaseOrder = PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.uniqid(),
        'supplier_name' => 'Test Supplier',
        'status' => PurchaseOrder::STATUS_ORDERED,
        'created_by' => $admin->id,
        'ordered_at' => now(),
    ]);

    $category = Category::query()->create([
        'name' => 'Test Category '.uniqid(),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'TST-'.uniqid(),
        'name' => 'Test Preorder Product '.uniqid(),
        'base_price' => 500,
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'is_active' => true,
    ]);

    $variant = $product->variants()->create([
        'sku' => 'TST-SKU-'.uniqid(),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => 'STD',
        'is_active' => true,
    ]);

    return PurchaseOrderItem::query()->create([
        'purchase_order_id' => $purchaseOrder->id,
        'item_type' => PurchaseOrderItem::TYPE_CATALOG,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_NEW,
        'product_variant_id' => $variant->id,
        'quantity_ordered' => $quantityOrdered,
        'track_inventory' => true,
    ]);
}

function preorderConfigPayload(array $overrides = []): array
{
    return array_merge([
        'preorder_enabled' => true,
        'expected_release_date' => now()->addDays(20)->toDateString(),
        'preorder_starts_at' => now()->addDay()->toDateTimeString(),
        'preorder_ends_at' => now()->addDays(10)->toDateTimeString(),
        'preorder_limit_per_student' => 1,
        'preorder_capacity' => 5,
        'preorder_payment_deadline_hours' => 72,
        'new_badge_duration_days' => 7,
    ], $overrides);
}

test('preorder capacity cannot exceed what was ordered on the purchase order', function () {
    $specialist = createSpecialistUser();
    $item = createNewMerchandisePurchaseOrderItem($specialist, quantityOrdered: 10);

    $response = $this
        ->actingAs($specialist)
        ->from('/staff/stock-receipts/create')
        ->patch(
            "/specialist/purchase-order-items/{$item->id}/preorder-configuration",
            preorderConfigPayload(['preorder_capacity' => 11]),
        );

    $response->assertSessionHasErrors('preorder_capacity');

    expect($item->fresh()->productVariant->product->preorder_capacity)->toBeNull();
});

test('the per-student preorder limit cannot exceed what was ordered on the purchase order', function () {
    $specialist = createSpecialistUser();
    $item = createNewMerchandisePurchaseOrderItem($specialist, quantityOrdered: 5);

    $response = $this
        ->actingAs($specialist)
        ->from('/staff/stock-receipts/create')
        ->patch(
            "/specialist/purchase-order-items/{$item->id}/preorder-configuration",
            preorderConfigPayload(['preorder_capacity' => 5, 'preorder_limit_per_student' => 6]),
        );

    $response->assertSessionHasErrors('preorder_limit_per_student');
});

test('preorder capacity exactly matching the ordered quantity is accepted', function () {
    $specialist = createSpecialistUser();
    $item = createNewMerchandisePurchaseOrderItem($specialist, quantityOrdered: 10);

    $response = $this
        ->actingAs($specialist)
        ->from('/staff/stock-receipts/create')
        ->patch(
            "/specialist/purchase-order-items/{$item->id}/preorder-configuration",
            preorderConfigPayload(['preorder_capacity' => 10]),
        );

    $response->assertSessionHasNoErrors();

    expect($item->fresh()->productVariant->product->preorder_capacity)->toBe(10);
});

test('the payment deadline must be at least 3 days', function () {
    $specialist = createSpecialistUser();
    $item = createNewMerchandisePurchaseOrderItem($specialist);

    $response = $this
        ->actingAs($specialist)
        ->from('/staff/stock-receipts/create')
        ->patch(
            "/specialist/purchase-order-items/{$item->id}/preorder-configuration",
            preorderConfigPayload(['preorder_payment_deadline_hours' => 48]),
        );

    $response->assertSessionHasErrors('preorder_payment_deadline_hours');
});

test('the payment deadline cannot exceed 30 days', function () {
    $specialist = createSpecialistUser();
    $item = createNewMerchandisePurchaseOrderItem($specialist);

    $response = $this
        ->actingAs($specialist)
        ->from('/staff/stock-receipts/create')
        ->patch(
            "/specialist/purchase-order-items/{$item->id}/preorder-configuration",
            preorderConfigPayload(['preorder_payment_deadline_hours' => 721]),
        );

    $response->assertSessionHasErrors('preorder_payment_deadline_hours');
});

test('the NEW badge duration cannot exceed 90 days', function () {
    $specialist = createSpecialistUser();
    $item = createNewMerchandisePurchaseOrderItem($specialist);

    $response = $this
        ->actingAs($specialist)
        ->from('/staff/stock-receipts/create')
        ->patch(
            "/specialist/purchase-order-items/{$item->id}/preorder-configuration",
            preorderConfigPayload(['new_badge_duration_days' => 91]),
        );

    $response->assertSessionHasErrors('new_badge_duration_days');
});

test('a fully valid preorder configuration within every bound is saved', function () {
    $specialist = createSpecialistUser();
    $item = createNewMerchandisePurchaseOrderItem($specialist, quantityOrdered: 20);

    $response = $this
        ->actingAs($specialist)
        ->from('/staff/stock-receipts/create')
        ->patch(
            "/specialist/purchase-order-items/{$item->id}/preorder-configuration",
            preorderConfigPayload([
                'preorder_capacity' => 20,
                'preorder_limit_per_student' => 2,
                'preorder_payment_deadline_hours' => 168,
                'new_badge_duration_days' => 30,
            ]),
        );

    $response->assertSessionHasNoErrors();

    $product = $item->fresh()->productVariant->product;

    expect($product->preorder_capacity)->toBe(20)
        ->and($product->preorder_limit_per_student)->toBe(2)
        ->and($product->preorder_payment_deadline_hours)->toBe(168)
        ->and($product->new_badge_duration_days)->toBe(30);
});
