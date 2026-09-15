<?php

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| PO-Linked Receiving Cost Fallback
|--------------------------------------------------------------------------
|
| Since Manual Receiving was removed, purchase-order receiving
| is now the only path stock can enter through. This covers the
| unit_cost fallback logic in StockReceiptController::store():
| when no fresh purchasing price is typed on the receiving form,
| the PO item's own planned unit_cost is used instead.
*/

function poReceivingCostAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function poReceivingCostVariant(User $admin)
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
        'variant_key' => 'STD',
        'is_active' => true,
    ]);

    $variant->inventory()->create([
        'quantity_on_hand' => 0,
        'quantity_reserved' => 0,
        'reorder_level' => 5,
        'average_cost' => null,
    ]);

    return $variant->fresh('inventory');
}

function poReceivingCostItem(User $admin, $variant, ?float $plannedUnitCost): PurchaseOrderItem
{
    $purchaseOrder = PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.Str::random(8),
        'supplier_name' => 'Test Supplier',
        'status' => PurchaseOrder::STATUS_ORDERED,
        'created_by' => $admin->id,
        'ordered_at' => now(),
    ]);

    return $purchaseOrder->items()->create([
        'item_type' => PurchaseOrderItem::TYPE_CATALOG,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
        'product_variant_id' => $variant->id,
        'track_inventory' => true,
        'quantity_ordered' => 1000,
        'quantity_received' => 0,
        'unit_cost' => $plannedUnitCost,
    ]);
}

test('receiving without a fresh cost falls back to the purchase order item planned unit cost', function () {
    $admin = poReceivingCostAdmin();
    $variant = poReceivingCostVariant($admin);
    $poItem = poReceivingCostItem($admin, $variant, 120.00);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        // No unit_cost typed on the receiving form.
    ])->assertSessionDoesntHaveErrors();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect((float) $inventory->average_cost)->toBe(120.00);
    expect((int) $inventory->quantity_on_hand)->toBe(10);
});

test('a fresh cost typed on the receiving form overrides the purchase order item planned unit cost', function () {
    $admin = poReceivingCostAdmin();
    $variant = poReceivingCostVariant($admin);
    $poItem = poReceivingCostItem($admin, $variant, 120.00);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        'unit_cost' => 150,
    ])->assertSessionDoesntHaveErrors();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect((float) $inventory->average_cost)->toBe(150.00);
});

test('receiving with neither a fresh cost nor a planned cost leaves the average cost null', function () {
    $admin = poReceivingCostAdmin();
    $variant = poReceivingCostVariant($admin);
    $poItem = poReceivingCostItem($admin, $variant, null);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
    ])->assertSessionDoesntHaveErrors();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect($inventory->average_cost)->toBeNull();
    expect((int) $inventory->quantity_on_hand)->toBe(10);
});

test('a fresh cost on one receipt and a fallback cost on the next still compute a correct weighted average', function () {
    $admin = poReceivingCostAdmin();
    $variant = poReceivingCostVariant($admin);
    $poItem = poReceivingCostItem($admin, $variant, 120.00);

    // First receipt: specialist types a fresh price.
    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        'unit_cost' => 150,
    ])->assertSessionDoesntHaveErrors();

    // Second receipt against the same item: nothing typed, falls back to 120.
    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        // No unit_cost typed this time — falls back to the PO item's 120.
    ])->assertSessionDoesntHaveErrors();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    // (10*150 + 10*120) / 20 = 135
    expect((float) $inventory->average_cost)->toBe(135.00);
    expect((int) $inventory->quantity_on_hand)->toBe(20);
});
