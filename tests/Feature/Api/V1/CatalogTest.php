<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

function apiCatalogProduct(
    string $availabilityStatus = Product::AVAILABILITY_AVAILABLE,
    int $quantityOnHand = 10,
    ?string $name = null,
    ?string $imagePath = null,
): Product {
    $admin = User::factory()->create(['role' => 'admin']);

    $category = Category::query()->firstOrCreate(
        ['name' => 'Catalog Category'],
        ['is_active' => true],
    );

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => $name ?? 'Catalog Product '.Str::random(8),
        'base_price' => 250,
        'availability_status' => $availabilityStatus,
        'image_path' => $imagePath,
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
    ]);

    return $product;
}

function apiCatalogStudent(): User
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

    return $user;
}

test('the catalog needs a signed-in student', function () {
    $this->getJson('/api/v1/catalog')->assertUnauthorized();
});

test('a staff token cannot read the student catalog', function () {
    Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]), ['student']);

    $this->getJson('/api/v1/catalog')->assertUnauthorized();
});

test('the catalog pages the products and keeps coming soon in its own list', function () {
    foreach (range(1, 13) as $ignored) {
        apiCatalogProduct();
    }

    foreach (range(1, 4) as $ignored) {
        apiCatalogProduct(Product::AVAILABILITY_COMING_SOON, 0);
    }

    apiCatalogStudent();

    $this->getJson('/api/v1/catalog')
        ->assertOk()
        ->assertJsonCount(12, 'data')
        ->assertJsonCount(4, 'coming_soon')
        ->assertJsonPath('meta.total', 13)
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.last_page', 2)
        ->assertJsonPath('meta.per_page', 12);

    $this->getJson('/api/v1/catalog?page=2')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('coming_soon', [])
        ->assertJsonPath('meta.current_page', 2);
});

test('each product card carries the same details as the website card', function () {
    apiCatalogProduct(name: 'Blue Lanyard', imagePath: 'products/lanyard.jpg');

    apiCatalogStudent();

    $this->getJson('/api/v1/catalog')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Blue Lanyard')
        ->assertJsonPath('data.0.price_min', '250.00')
        ->assertJsonPath('data.0.price_max', '250.00')
        ->assertJsonPath('data.0.availability_status', 'available')
        ->assertJsonPath('data.0.availability_label', 'Available')
        ->assertJsonPath('data.0.category.name', 'Catalog Category')
        ->assertJsonPath('data.0.variants_count', 1)
        ->assertJsonStructure(['data' => [[
            'id', 'code', 'name', 'description', 'price_min', 'price_max',
            'variant_mode', 'variant_mode_label', 'variants_count',
            'availability_status', 'availability_label', 'availability_summary',
            'stock_urgency', 'early_bird', 'preorder_enabled', 'accepts_preorders',
            'expected_release_date', 'image_url', 'category' => ['id', 'name'],
        ]]]);

    $imageUrl = $this->getJson('/api/v1/catalog')->json('data.0.image_url');

    expect($imageUrl)->toStartWith('http')
        ->and($imageUrl)->toEndWith('/storage/products/lanyard.jpg');
});

test('the status filter uses the status shown on the card', function () {
    $realAvailable = apiCatalogProduct(Product::AVAILABILITY_AVAILABLE, 10);
    $emptyShelf = apiCatalogProduct(Product::AVAILABILITY_AVAILABLE, 0);

    apiCatalogStudent();

    $available = collect($this->getJson('/api/v1/catalog?status=available')->json('data'))->pluck('id')->all();
    $outOfStock = collect($this->getJson('/api/v1/catalog?status=out_of_stock')->json('data'))->pluck('id')->all();

    expect($available)->toBe([$realAvailable->id])
        ->and($outOfStock)->toBe([$emptyShelf->id]);
});

test('search narrows the catalog and the filters are echoed back', function () {
    apiCatalogProduct(name: 'Blue Lanyard');
    apiCatalogProduct(name: 'Red Uniform');

    apiCatalogStudent();

    $this->getJson('/api/v1/catalog?search=Blue&status=available')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Blue Lanyard')
        ->assertJsonPath('filters.search', 'Blue')
        ->assertJsonPath('filters.status', 'available');
});

test('an inactive product never reaches the app', function () {
    $hidden = apiCatalogProduct(name: 'Hidden Cap');
    $hidden->forceFill(['is_active' => false])->save();

    apiCatalogStudent();

    $this->getJson('/api/v1/catalog')->assertOk()->assertJsonCount(0, 'data');
});
