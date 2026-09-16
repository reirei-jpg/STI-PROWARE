<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Support\Str;

function linkTestAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function linkTestVariant(User $admin)
{
    $category = Category::query()->create([
        'name' => 'Category '.Str::random(8),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'Test Product',
        'base_price' => 500,
        'is_active' => true,
    ]);

    $variant = $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => Str::random(8),
        'is_active' => true,
    ]);

    $variant->inventory()->create([
        'quantity_on_hand' => 0,
        'quantity_reserved' => 0,
        'reorder_level' => 5,
    ]);

    return $variant->fresh('inventory');
}

function linkTestManualItem(User $admin): PurchaseOrderItem
{
    $purchaseOrder = PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.Str::random(8),
        'supplier_name' => 'Test Supplier',
        'status' => PurchaseOrder::STATUS_ORDERED,
        'created_by' => $admin->id,
        'ordered_at' => now(),
    ]);

    return $purchaseOrder->items()->create([
        'item_type' => PurchaseOrderItem::TYPE_MANUAL,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_NEW,
        'manual_name' => 'Some Unlisted Item',
        'track_inventory' => false,
        'quantity_ordered' => 50,
        'quantity_received' => 0,
        'unit_cost' => 25.00,
    ]);
}

test('linking a manual item to an existing variant succeeds', function () {
    $admin = linkTestAdmin();
    $variant = linkTestVariant($admin);
    $item = linkTestManualItem($admin);

    $this->actingAs($admin)
        ->post("/staff/stock-receipts/purchase-order-items/{$item->id}/link-variant", [
            'product_variant_id' => $variant->id,
        ])
        ->assertSessionDoesntHaveErrors();

    $item->refresh();

    expect($item->product_variant_id)->toBe($variant->id);
    expect($item->merchandise_origin)->toBe(PurchaseOrderItem::ORIGIN_EXISTING);
    expect($item->track_inventory)->toBeTrue();
});

test('an item already linked to a variant cannot be linked again to a different one', function () {
    $admin = linkTestAdmin();
    $variantA = linkTestVariant($admin);
    $variantB = linkTestVariant($admin);
    $item = linkTestManualItem($admin);

    $item->update([
        'product_variant_id' => $variantA->id,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
        'track_inventory' => true,
    ]);

    $this->actingAs($admin)->post(
        "/staff/stock-receipts/purchase-order-items/{$item->id}/link-variant",
        ['product_variant_id' => $variantB->id],
    );

    $item->refresh();

    // Still linked to the original variant — a second link attempt
    // must never silently overwrite an existing link.
    expect($item->product_variant_id)->toBe($variantA->id);
});
