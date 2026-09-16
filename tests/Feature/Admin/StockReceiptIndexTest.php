<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Str;

function stockReceiptAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function stockReceiptVariant(User $admin)
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
        'base_price' => 100,
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
        'quantity_on_hand' => 10,
        'quantity_reserved' => 0,
        'reorder_level' => 5,
    ]);

    return $variant->fresh('inventory');
}

function stockReceiptMovement(User $admin, $variant, $createdAt): StockMovement
{
    $movement = StockMovement::query()->create([
        'receipt_number' => 'RCPT-'.Str::random(10),
        'inventory_id' => $variant->inventory->id,
        'product_variant_id' => $variant->id,
        'performed_by' => $admin->id,
        'movement_type' => StockMovement::TYPE_RECEIVE,
        'quantity_change' => 5,
        'quantity_before' => 5,
        'quantity_after' => 10,
    ]);

    $movement->forceFill(['created_at' => $createdAt])->save();

    return $movement->fresh();
}

test('the summary counts and date filter reflect only today\'s receipts', function () {
    $admin = stockReceiptAdmin();
    $variant = stockReceiptVariant($admin);

    $todayReceipt = stockReceiptMovement($admin, $variant, now());
    stockReceiptMovement($admin, $variant, now()->subDays(3));

    $response = $this->actingAs($admin)->get('/staff/stock-receipts');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('staff/StockReceipts/Index')
        ->where('summary.total_receipts', 2)
        ->where('summary.received_today', 1),
    );

    $filteredResponse = $this->actingAs($admin)->get('/staff/stock-receipts?date=today');

    $filteredResponse->assertOk();
    $filteredResponse->assertInertia(fn ($page) => $page
        ->where('receipts.total', 1)
        ->where('receipts.data.0.id', $todayReceipt->id),
    );
});

test('a super admin can view receipt history and a single receipt', function () {
    $superAdmin = User::factory()->create([
        'role' => 'super_admin',
        'is_active' => true,
    ]);

    $variant = stockReceiptVariant($superAdmin);
    $movement = stockReceiptMovement($superAdmin, $variant, now());

    $this->actingAs($superAdmin)
        ->get('/staff/stock-receipts')
        ->assertOk();

    $this->actingAs($superAdmin)
        ->get("/staff/stock-receipts/{$movement->id}")
        ->assertOk();
});
