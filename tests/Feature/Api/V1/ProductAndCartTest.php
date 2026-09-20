<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

function apiShopProduct(array $overrides = []): Product
{
    $admin = User::factory()->create(['role' => 'admin']);

    $category = Category::query()->firstOrCreate(
        ['name' => 'Shop Category'],
        ['is_active' => true],
    );

    $product = Product::query()->create(array_merge([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'Shop Product '.Str::random(6),
        'description' => 'Warm and soft.',
        'base_price' => 300,
        'variant_mode' => Product::VARIANT_MODE_PROGRAM_AND_SIZE,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'is_active' => true,
    ], $overrides));

    $inStock = $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'program' => 'BSIT',
        'size' => 'M',
        'variant_name' => 'BSIT - M',
        'variant_key' => 'BSIT|M',
        'price_override' => 350,
        'is_active' => true,
    ]);
    $inStock->inventory()->create(['quantity_on_hand' => 8, 'quantity_reserved' => 3, 'reorder_level' => 2]);

    $soldOut = $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'program' => 'BSIT',
        'size' => 'L',
        'variant_name' => 'BSIT - L',
        'variant_key' => 'BSIT|L',
        'is_active' => true,
    ]);
    $soldOut->inventory()->create(['quantity_on_hand' => 2, 'quantity_reserved' => 2, 'reorder_level' => 2]);

    return $product->fresh('variants');
}

function apiShopStudent(): User
{
    $user = User::factory()->create(['role' => User::ROLE_STUDENT, 'is_active' => true]);

    Student::query()->create([
        'user_id' => $user->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '2',
        'status' => 'active',
    ]);

    Sanctum::actingAs($user->fresh('student'), ['student']);

    return $user->fresh('student');
}

function apiShopVariant(Product $product, string $size)
{
    return $product->variants->firstWhere('size', $size);
}

test('the product page data and the cart need a signed-in student', function () {
    $product = apiShopProduct();

    $this->getJson("/api/v1/catalog/{$product->id}")->assertUnauthorized();
    $this->postJson('/api/v1/cart/items', [])->assertUnauthorized();

    Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]), ['student']);

    $this->getJson("/api/v1/catalog/{$product->id}")->assertUnauthorized();
    $this->postJson('/api/v1/cart/items', [
        'product_variant_id' => apiShopVariant($product, 'M')->id,
        'quantity' => 1,
    ])->assertUnauthorized();
});

test('the product page data lists the active variants with a general stock status', function () {
    $product = apiShopProduct();
    apiShopStudent();

    $this->getJson("/api/v1/catalog/{$product->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $product->id)
        ->assertJsonPath('data.name', $product->name)
        ->assertJsonPath('data.description', 'Warm and soft.')
        ->assertJsonPath('data.availability_status', 'available')
        ->assertJsonPath('data.availability_summary', 'Available')
        ->assertJsonPath('data.variant_mode', 'program_and_size')
        ->assertJsonPath('data.category.name', 'Shop Category')
        ->assertJsonPath('data.price_min', '300.00')
        ->assertJsonPath('data.price_max', '350.00')
        ->assertJsonPath('data.stock_urgency', 'low_stock')
        ->assertJsonCount(2, 'data.variants')
        ->assertJsonPath('data.variants.0.size', 'L')
        ->assertJsonPath('data.variants.0.is_available', false)
        ->assertJsonPath('data.variants.0.stock_status', 'Unavailable')
        ->assertJsonPath('data.variants.1.size', 'M')
        ->assertJsonPath('data.variants.1.is_available', true)
        ->assertJsonPath('data.variants.1.stock_status', 'Available');
});

test('exact stock counts never reach the app', function () {
    $product = apiShopProduct();
    apiShopStudent();

    $body = $this->getJson("/api/v1/catalog/{$product->id}")->assertOk()->getContent();

    expect($body)->not->toContain('quantity_on_hand')
        ->and($body)->not->toContain('quantity_reserved')
        ->and($body)->not->toContain('available_quantity');
});

test('an inactive product has no page', function () {
    $product = apiShopProduct(['is_active' => false]);
    apiShopStudent();

    $this->getJson("/api/v1/catalog/{$product->id}")->assertNotFound();
});

test('a student adds a variant to their cart and adding again increases the quantity', function () {
    $product = apiShopProduct();
    $student = apiShopStudent();
    $variant = apiShopVariant($product, 'M');

    $this->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 2])
        ->assertCreated()
        ->assertJsonPath('message', 'Product added to your cart.')
        ->assertJsonPath('data.cart_total_quantity', 2);

    $this->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 1])
        ->assertCreated()
        ->assertJsonPath('data.cart_total_quantity', 3);

    $cart = Cart::query()->where('student_id', $student->student->id)->where('status', Cart::STATUS_ACTIVE)->first();
    $item = CartItem::query()->where('cart_id', $cart->id)->first();

    expect($item->quantity)->toBe(3)
        ->and($item->product_variant_id)->toBe($variant->id)
        ->and((float) $item->unit_price)->toBe(350.0);
});

test('a student cannot add more than is available', function () {
    $product = apiShopProduct();
    apiShopStudent();
    $variant = apiShopVariant($product, 'M');

    $this->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 6])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity' => 'You already have 0 unit(s) of BSIT - M in your cart. There are 5 unit(s) available in total. You may add up to 5 more unit(s).']);

    expect(CartItem::query()->count())->toBe(0);
});

test('a sold out variant cannot be added', function () {
    $product = apiShopProduct();
    apiShopStudent();

    $this->postJson('/api/v1/cart/items', [
        'product_variant_id' => apiShopVariant($product, 'L')->id,
        'quantity' => 1,
    ])->assertUnprocessable();

    expect(CartItem::query()->count())->toBe(0);
});

test('the quantity and variant are checked with the website messages', function () {
    $product = apiShopProduct();
    apiShopStudent();
    $variant = apiShopVariant($product, 'M');

    $this->postJson('/api/v1/cart/items', ['quantity' => 1])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['product_variant_id' => 'Please select a product variant.']);

    $this->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 0])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity' => 'The quantity must be at least 1.']);

    $this->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 100])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity' => 'You may add a maximum of 99 units.']);

    $this->postJson('/api/v1/cart/items', ['product_variant_id' => 999999, 'quantity' => 1])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['product_variant_id' => 'The selected product variant is invalid or inactive.']);
});

test('a preorder item respects the per-student preorder limit', function () {
    $product = apiShopProduct([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_limit_per_student' => 2,
    ]);
    apiShopStudent();
    $variant = apiShopVariant($product, 'M');

    $this->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 2])
        ->assertCreated();

    expect(CartItem::query()->first()->item_type)->toBe(CartItem::TYPE_PREORDER);

    $this->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 1])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity' => 'You already have 2 preorder unit(s) of BSIT - M in your cart. This product allows a maximum of 2 unit(s) per student. You may add up to 0 more unit(s).']);
});
