<?php

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use App\Services\PreorderWindowGraduationService;

/**
 * A Coming Soon, preorder-enabled product whose preorder window has already
 * closed, with an optional variant carrying whatever stock arrived.
 */
function makeClosedPreorderProduct(int $quantityOnHand): Product
{
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $category = Category::query()->create([
        'name' => 'Test Category '.uniqid(),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'TST-'.uniqid(),
        'name' => 'Test Closed Preorder '.uniqid(),
        'base_price' => 500,
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_starts_at' => now()->subDays(10),
        'preorder_ends_at' => now()->subDay(),
        'is_active' => true,
    ]);

    $variant = $product->variants()->create([
        'sku' => 'TST-SKU-'.uniqid(),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => 'STD',
        'is_active' => true,
    ]);

    Inventory::query()->create([
        'product_variant_id' => $variant->id,
        'quantity_on_hand' => $quantityOnHand,
        'quantity_reserved' => 0,
        'reorder_level' => 0,
    ]);

    return $product;
}

test('a closed preorder window with stock becomes available and starts the New badge', function () {
    $product = makeClosedPreorderProduct(quantityOnHand: 5);

    app(PreorderWindowGraduationService::class)->graduateClosedWindows();

    $product->refresh();

    expect($product->availability_status)->toBe(Product::AVAILABILITY_AVAILABLE)
        ->and($product->new_badge_started_at)->not->toBeNull();
});

test('a closed preorder window with no stock becomes out of stock', function () {
    $product = makeClosedPreorderProduct(quantityOnHand: 0);

    app(PreorderWindowGraduationService::class)->graduateClosedWindows();

    $product->refresh();

    expect($product->availability_status)->toBe(Product::AVAILABILITY_OUT_OF_STOCK)
        ->and($product->new_badge_started_at)->toBeNull();
});

test('a preorder window that is still open is left untouched', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $category = Category::query()->create([
        'name' => 'Test Category '.uniqid(),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'TST-'.uniqid(),
        'name' => 'Test Open Preorder '.uniqid(),
        'base_price' => 500,
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_starts_at' => now()->subDay(),
        'preorder_ends_at' => now()->addDays(5),
        'is_active' => true,
    ]);

    app(PreorderWindowGraduationService::class)->graduateClosedWindows();

    expect($product->fresh()->availability_status)->toBe(Product::AVAILABILITY_COMING_SOON);
});

test('a badge already started is not restarted when the window closes', function () {
    $product = makeClosedPreorderProduct(quantityOnHand: 3);

    $product->update(['new_badge_started_at' => now()->subDays(20)]);

    $originalStart = $product->fresh()->new_badge_started_at;

    app(PreorderWindowGraduationService::class)->graduateClosedWindows();

    expect(
        $product->fresh()->new_badge_started_at->equalTo($originalStart),
    )->toBeTrue();
});
