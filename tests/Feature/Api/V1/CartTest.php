<?php

use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use App\Services\CartService;
use Laravel\Sanctum\Sanctum;

function apiCartFill(User $student, $variant, int $quantity): void
{
    app(CartService::class)->addForStudent($student, $variant, $quantity);
}

function apiCartAs(User $student): void
{
    Sanctum::actingAs($student, ['student']);
}

function apiCartPreorderVariant(int $limit = 2)
{
    $variant = makeVariantWithStock(10, 0);

    $variant->product->forceFill([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_limit_per_student' => $limit,
    ])->save();

    return $variant->fresh();
}

test('the cart endpoints need a signed-in student', function () {
    $this->getJson('/api/v1/cart')->assertUnauthorized();
    $this->patchJson('/api/v1/cart/items/1', ['quantity' => 2])->assertUnauthorized();
    $this->deleteJson('/api/v1/cart/items/1')->assertUnauthorized();

    Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]), ['student']);

    $this->getJson('/api/v1/cart')->assertUnauthorized();
});

test('a student with nothing in the cart gets an empty cart', function () {
    apiCartAs(makeStudentAccount());

    $this->getJson('/api/v1/cart')
        ->assertOk()
        ->assertJsonPath('data.id', null)
        ->assertJsonPath('data.total_quantity', 0)
        ->assertJsonPath('data.subtotal', '0.00')
        ->assertJsonPath('data.items', []);
});

test('the cart lists the items with photos, prices and totals', function () {
    $student = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);
    apiCartFill($student, $variant, 3);
    apiCartAs($student);

    $this->getJson('/api/v1/cart')
        ->assertOk()
        ->assertJsonPath('data.total_quantity', 3)
        ->assertJsonPath('data.subtotal', '300.00')
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.quantity', 3)
        ->assertJsonPath('data.items.0.item_type', 'order')
        ->assertJsonPath('data.items.0.line_total', '300.00')
        ->assertJsonPath('data.items.0.variant.variant_name', 'Standard')
        ->assertJsonPath('data.items.0.product.name', 'Test Product')
        ->assertJsonStructure(['data' => ['items' => [[
            'id', 'item_type', 'quantity', 'unit_price', 'line_total',
            'variant' => ['id', 'sku', 'program', 'size', 'variant_name'],
            'product' => ['id', 'code', 'name', 'image_url', 'category' => ['id', 'name']],
        ]]]]);
});

test('a student only sees their own cart', function () {
    $owner = makeStudentAccount();
    apiCartFill($owner, makeVariantWithStock(10, 0), 2);

    apiCartAs(makeStudentAccount());

    $this->getJson('/api/v1/cart')->assertOk()->assertJsonPath('data.items', []);
});

test('changing a quantity returns the refreshed cart', function () {
    $student = makeStudentAccount();
    apiCartFill($student, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();
    apiCartAs($student);

    $this->patchJson("/api/v1/cart/items/{$item->id}", ['quantity' => 5])
        ->assertOk()
        ->assertJsonPath('message', 'Cart quantity updated.')
        ->assertJsonPath('data.total_quantity', 5)
        ->assertJsonPath('data.subtotal', '500.00')
        ->assertJsonPath('data.items.0.quantity', 5);

    expect($item->fresh()->quantity)->toBe(5);
});

test('a quantity above the available stock is refused', function () {
    $student = makeStudentAccount();
    apiCartFill($student, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();
    apiCartAs($student);

    $this->patchJson("/api/v1/cart/items/{$item->id}", ['quantity' => 11])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity' => 'Only 10 unit(s) are currently available for Standard.']);

    expect($item->fresh()->quantity)->toBe(2);
});

test('the cart quantity is checked with the website messages', function () {
    $student = makeStudentAccount();
    apiCartFill($student, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();
    apiCartAs($student);

    $this->patchJson("/api/v1/cart/items/{$item->id}", ['quantity' => 0])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity' => 'The quantity must be at least 1.']);

    $this->patchJson("/api/v1/cart/items/{$item->id}", ['quantity' => 100])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity' => 'You may add a maximum of 99 units.']);

    $this->patchJson("/api/v1/cart/items/{$item->id}", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity' => 'Please provide the new quantity.']);
});

test('a preorder quantity respects the per-student limit', function () {
    $student = makeStudentAccount();
    apiCartFill($student, apiCartPreorderVariant(2), 2);
    $item = CartItem::query()->first();
    apiCartAs($student);

    $this->patchJson("/api/v1/cart/items/{$item->id}", ['quantity' => 3])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity' => 'This product allows a maximum of 2 preorder unit(s) per student for this batch.']);
});

test('removing an item returns the refreshed cart', function () {
    $student = makeStudentAccount();
    apiCartFill($student, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();
    apiCartAs($student);

    $this->deleteJson("/api/v1/cart/items/{$item->id}")
        ->assertOk()
        ->assertJsonPath('message', 'Item removed from your cart.')
        ->assertJsonPath('data.total_quantity', 0)
        ->assertJsonPath('data.items', []);

    expect(CartItem::query()->count())->toBe(0);
});

test('a student cannot change or remove another students item', function () {
    $owner = makeStudentAccount();
    apiCartFill($owner, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();

    apiCartAs(makeStudentAccount());

    $this->patchJson("/api/v1/cart/items/{$item->id}", ['quantity' => 4])->assertForbidden();
    $this->deleteJson("/api/v1/cart/items/{$item->id}")->assertForbidden();

    expect($item->fresh()->quantity)->toBe(2);
});

test('an item that does not exist is a not found', function () {
    apiCartAs(makeStudentAccount());

    $this->patchJson('/api/v1/cart/items/999999', ['quantity' => 2])->assertNotFound();
    $this->deleteJson('/api/v1/cart/items/999999')->assertNotFound();
});
