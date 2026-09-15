<?php

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Str;

function inventoryAdjustmentAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function inventoryAdjustmentSpecialist(): User
{
    return User::factory()->create([
        'role' => 'specialist',
        'is_active' => true,
    ]);
}

function inventoryAdjustmentVariant(User $admin, int $quantityOnHand = 20)
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
        'quantity_on_hand' => $quantityOnHand,
        'quantity_reserved' => 0,
        'reorder_level' => 5,
        'average_cost' => '100.00',
    ]);

    return $variant->fresh('inventory');
}

test('admin can increase stock with a reason', function () {
    $admin = inventoryAdjustmentAdmin();
    $variant = inventoryAdjustmentVariant($admin, 20);

    $this->actingAs($admin)->post('/staff/inventory/adjustments', [
        'product_variant_id' => $variant->id,
        'direction' => 'increase',
        'quantity' => 5,
        'reason' => 'Physical count found extra units in storage.',
    ])->assertSessionDoesntHaveErrors();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect((int) $inventory->quantity_on_hand)->toBe(25);

    // An adjustment is not a purchase — it never touches cost.
    expect((float) $inventory->average_cost)->toBe(100.00);

    $movement = StockMovement::query()
        ->where('product_variant_id', $variant->id)
        ->latest('id')
        ->first();

    expect($movement->movement_type)->toBe(StockMovement::TYPE_ADJUSTMENT);
    expect($movement->quantity_change)->toBe(5);
    expect($movement->receipt_number)->toBeNull();
    expect($movement->notes)->toBe('Physical count found extra units in storage.');
});

test('admin can decrease stock with a reason', function () {
    $admin = inventoryAdjustmentAdmin();
    $variant = inventoryAdjustmentVariant($admin, 20);

    $this->actingAs($admin)->post('/staff/inventory/adjustments', [
        'product_variant_id' => $variant->id,
        'direction' => 'decrease',
        'quantity' => 8,
        'reason' => 'Damaged units found during monthly audit.',
    ])->assertSessionDoesntHaveErrors();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect((int) $inventory->quantity_on_hand)->toBe(12);

    $movement = StockMovement::query()
        ->where('product_variant_id', $variant->id)
        ->latest('id')
        ->first();

    expect($movement->quantity_change)->toBe(-8);
});

test('an adjustment cannot take quantity on hand below zero', function () {
    $admin = inventoryAdjustmentAdmin();
    $variant = inventoryAdjustmentVariant($admin, 5);

    $this->actingAs($admin)->post('/staff/inventory/adjustments', [
        'product_variant_id' => $variant->id,
        'direction' => 'decrease',
        'quantity' => 10,
        'reason' => 'Trying to remove more than is on hand.',
    ])->assertSessionHasErrors('quantity');

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect((int) $inventory->quantity_on_hand)->toBe(5);

    $this->assertDatabaseMissing('stock_movements', [
        'product_variant_id' => $variant->id,
        'movement_type' => StockMovement::TYPE_ADJUSTMENT,
    ]);
});

test('a reason is required', function () {
    $admin = inventoryAdjustmentAdmin();
    $variant = inventoryAdjustmentVariant($admin, 20);

    $this->actingAs($admin)->post('/staff/inventory/adjustments', [
        'product_variant_id' => $variant->id,
        'direction' => 'increase',
        'quantity' => 5,
        'reason' => '',
    ])->assertSessionHasErrors('reason');

    $this->assertDatabaseMissing('stock_movements', [
        'product_variant_id' => $variant->id,
        'movement_type' => StockMovement::TYPE_ADJUSTMENT,
    ]);
});

test('specialist cannot record an inventory adjustment', function () {
    $specialist = inventoryAdjustmentSpecialist();
    $variant = inventoryAdjustmentVariant($specialist, 20);

    $this->actingAs($specialist)->post('/staff/inventory/adjustments', [
        'product_variant_id' => $variant->id,
        'direction' => 'increase',
        'quantity' => 5,
        'reason' => 'Specialist attempting an adjustment.',
    ])->assertForbidden();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect((int) $inventory->quantity_on_hand)->toBe(20);
});
