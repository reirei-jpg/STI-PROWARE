<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Str;

function storefrontMakeProduct(
    string $availabilityStatus = Product::AVAILABILITY_AVAILABLE,
    int $quantityOnHand = 10,
    ?string $name = null,
): Product {
    $admin = User::factory()->create(['role' => 'admin']);

    $category = Category::query()->firstOrCreate(
        ['name' => 'Storefront Category'],
        ['is_active' => true],
    );

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => $name ?? 'Storefront Product '.Str::random(8),
        'base_price' => 100,
        'availability_status' => $availabilityStatus,
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

test('coming soon products never take up grid slots or count toward pagination', function () {
    $studentUser = makeStudentAccount();

    foreach (range(1, 13) as $ignored) {
        storefrontMakeProduct();
    }

    foreach (range(1, 4) as $ignored) {
        storefrontMakeProduct(Product::AVAILABILITY_COMING_SOON, 0);
    }

    $this->actingAs($studentUser)
        ->get('/student/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('student/Dashboard')
            ->where('homeProducts.total', 13)
            ->has('homeProducts.data', 12)
            ->has('comingSoonProducts', 4),
        );

    $this->actingAs($studentUser)
        ->get('/student/dashboard?page=2')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('homeProducts.total', 13)
            ->has('homeProducts.data', 1),
        );
});

test('the status filter matches the status shown on each card', function () {
    $studentUser = makeStudentAccount();

    $realAvailable = storefrontMakeProduct(Product::AVAILABILITY_AVAILABLE, 10);
    // Marked available by an admin, but with no stock: the card says Out of Stock.
    $emptyShelf = storefrontMakeProduct(Product::AVAILABILITY_AVAILABLE, 0);
    $markedOut = storefrontMakeProduct(Product::AVAILABILITY_OUT_OF_STOCK, 10);

    $idsFor = function (string $status) use ($studentUser): array {
        $ids = [];

        $this->actingAs($studentUser)
            ->get('/student/dashboard?status='.$status)
            ->assertOk()
            ->assertInertia(function ($page) use (&$ids) {
                $ids = collect($page->toArray()['props']['homeProducts']['data'])
                    ->pluck('id')->sort()->values()->all();
            });

        return $ids;
    };

    expect($idsFor('available'))->toBe([$realAvailable->id])
        ->and($idsFor('out_of_stock'))->toBe(collect([$emptyShelf->id, $markedOut->id])->sort()->values()->all());
});

test('filtering by coming soon empties the grid but keeps the carousel', function () {
    $studentUser = makeStudentAccount();

    storefrontMakeProduct();
    storefrontMakeProduct(Product::AVAILABILITY_COMING_SOON, 0);

    $this->actingAs($studentUser)
        ->get('/student/dashboard?status=coming_soon')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('homeProducts.total', 0)
            ->has('comingSoonProducts', 1),
        );
});

test('inactive products are hidden and the search filter narrows the grid', function () {
    $studentUser = makeStudentAccount();

    storefrontMakeProduct(name: 'Blue Lanyard');
    storefrontMakeProduct(name: 'Red Uniform');
    $hidden = storefrontMakeProduct(name: 'Blue Hidden Cap');
    $hidden->forceFill(['is_active' => false])->save();

    $this->actingAs($studentUser)
        ->get('/student/dashboard?search=Blue')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('homeProducts.total', 1)
            ->where('homeProducts.data.0.name', 'Blue Lanyard'),
        );
});

test('storefront cards expose a price range and no duplicate base price', function () {
    $studentUser = makeStudentAccount();

    storefrontMakeProduct();

    $this->actingAs($studentUser)
        ->get('/student/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('homeProducts.data.0.price_min', '100.00')
            ->where('homeProducts.data.0.price_max', '100.00')
            ->missing('homeProducts.data.0.base_price'),
        );
});

test('a non-student cannot open the student storefront', function () {
    $specialist = makeSpecialist();

    $this->actingAs($specialist)
        ->get('/student/dashboard')
        ->assertForbidden();
});
