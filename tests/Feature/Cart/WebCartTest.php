<?php

use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use App\Services\CartService;

function webCartAdd(User $user, $variant, int $quantity): void
{
    app(CartService::class)->addForStudent($user, $variant, $quantity);
}

function webCartPreorderVariant(int $limit = 2)
{
    $variant = makeVariantWithStock(10, 0);

    $variant->product->forceFill([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_limit_per_student' => $limit,
    ])->save();

    return $variant->fresh();
}

test('an empty cart page has no cart', function () {
    $this->actingAs(makeStudentAccount())
        ->get('/cart')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('cart/Index')
            ->where('cart', null),
        );
});

test('the cart page lists the items with their totals', function () {
    $student = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);

    webCartAdd($student, $variant, 2);

    $this->actingAs($student)
        ->get('/cart')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('cart/Index')
            ->where('cart.status', 'active')
            ->where('cart.total_quantity', 2)
            ->where('cart.subtotal', '200.00')
            ->has('cart.items', 1)
            ->where('cart.items.0.quantity', 2)
            ->where('cart.items.0.item_type', 'order')
            ->where('cart.items.0.unit_price', fn ($price) => (float) $price === 100.0)
            ->where('cart.items.0.line_total', '200.00')
            ->where('cart.items.0.variant.id', $variant->id)
            ->where('cart.items.0.variant.variant_name', 'Standard')
            ->where('cart.items.0.product.name', 'Test Product')
            ->where('cart.items.0.product.category.id', $variant->product->category_id),
        );
});

test('a student can change a cart quantity', function () {
    $student = makeStudentAccount();
    webCartAdd($student, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();

    $this->actingAs($student)
        ->patch("/cart/items/{$item->id}", ['quantity' => 5])
        ->assertSessionHasNoErrors();

    expect($item->fresh()->quantity)->toBe(5);
});

test('a quantity above the available stock is refused', function () {
    $student = makeStudentAccount();
    webCartAdd($student, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();

    $this->actingAs($student)
        ->patch("/cart/items/{$item->id}", ['quantity' => 11])
        ->assertSessionHasErrors(['quantity' => 'Only 10 unit(s) are currently available for Standard.']);

    expect($item->fresh()->quantity)->toBe(2);
});

test('the cart quantity is checked with the website messages', function () {
    $student = makeStudentAccount();
    webCartAdd($student, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();

    $this->actingAs($student)
        ->patch("/cart/items/{$item->id}", ['quantity' => 0])
        ->assertSessionHasErrors(['quantity' => 'The quantity must be at least 1.']);

    $this->actingAs($student)
        ->patch("/cart/items/{$item->id}", ['quantity' => 100])
        ->assertSessionHasErrors(['quantity' => 'You may add a maximum of 99 units.']);

    $this->actingAs($student)
        ->patch("/cart/items/{$item->id}", [])
        ->assertSessionHasErrors(['quantity' => 'Please provide the new quantity.']);
});

test('a preorder quantity respects the per-student limit', function () {
    $student = makeStudentAccount();
    webCartAdd($student, webCartPreorderVariant(2), 2);
    $item = CartItem::query()->first();

    expect($item->item_type)->toBe(CartItem::TYPE_PREORDER);

    $this->actingAs($student)
        ->patch("/cart/items/{$item->id}", ['quantity' => 3])
        ->assertSessionHasErrors(['quantity' => 'This product allows a maximum of 2 preorder unit(s) per student.']);

    expect($item->fresh()->quantity)->toBe(2);
});

test('a student can remove a cart item', function () {
    $student = makeStudentAccount();
    webCartAdd($student, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();

    $this->actingAs($student)
        ->delete("/cart/items/{$item->id}")
        ->assertSessionHas('success', 'Item removed from your cart.');

    expect(CartItem::query()->count())->toBe(0);
});

test('a student cannot change or remove another students cart item', function () {
    $owner = makeStudentAccount();
    $other = makeStudentAccount();
    webCartAdd($owner, makeVariantWithStock(10, 0), 2);
    $item = CartItem::query()->first();

    $this->actingAs($other)->patch("/cart/items/{$item->id}", ['quantity' => 4])->assertForbidden();
    $this->actingAs($other)->delete("/cart/items/{$item->id}")->assertForbidden();

    expect($item->fresh())->not->toBeNull()
        ->and($item->fresh()->quantity)->toBe(2);
});
