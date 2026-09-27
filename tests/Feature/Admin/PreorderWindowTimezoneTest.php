<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

function preorderTimezoneTestProduct(User $admin): Product
{
    $category = Category::query()->create([
        'name' => 'Preorder Category '.uniqid(),
        'is_active' => true,
    ]);

    return Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRO-TZ'.random_int(1000, 9999),
        'name' => 'Preorder Hoodie',
        'base_price' => 100,
        'variant_mode' => Product::VARIANT_MODE_STANDARD,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'preorder_enabled' => false,
        'is_active' => true,
    ]);
}

afterEach(function () {
    Carbon::setTestNow();
});

test('a preorder window typed in Manila time opens right away, not 8 hours later', function () {
    // 4:58 PM in Manila is 8:58 AM UTC.
    Carbon::setTestNow(Carbon::parse('2026-09-27 08:58:00', 'UTC'));

    $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    $product = preorderTimezoneTestProduct($admin);

    $this->actingAs($admin)
        ->put("/admin/products/{$product->id}", [
            'category_id' => $product->category_id,
            'name' => $product->name,
            'base_price' => 100,
            'availability_status' => Product::AVAILABILITY_COMING_SOON,
            'expected_release_date' => '2026-10-05',
            'preorder_enabled' => true,
            'preorder_starts_at' => '2026-09-27T16:58',
            'preorder_ends_at' => '2026-10-02T17:00',
            'preorder_limit_per_student' => 2,
            'preorder_capacity' => 50,
            'is_active' => true,
        ])
        ->assertSessionDoesntHaveErrors();

    $product->refresh();

    expect($product->preorder_starts_at->utc()->toDateTimeString())->toBe('2026-09-27 08:58:00')
        ->and($product->preorder_ends_at->utc()->toDateTimeString())->toBe('2026-10-02 09:00:00')
        ->and($product->acceptsPreorders())->toBeTrue();

    // Friday 5:01 PM Manila: the window has closed.
    Carbon::setTestNow(Carbon::parse('2026-10-02 09:01:00', 'UTC'));

    expect($product->acceptsPreorders())->toBeFalse();
});

test('the edit page shows the saved preorder window in Manila time', function () {
    $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    $product = preorderTimezoneTestProduct($admin);
    $product->update([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_starts_at' => Carbon::parse('2026-09-27 08:58:00', 'UTC'),
        'preorder_ends_at' => Carbon::parse('2026-10-02 09:00:00', 'UTC'),
    ]);

    $this->actingAs($admin)
        ->get("/admin/products/{$product->id}/edit")
        ->assertInertia(fn (Assert $page) => $page
            ->where('product.preorder_starts_at', '2026-09-27T16:58')
            ->where('product.preorder_ends_at', '2026-10-02T17:00'));
});

test('dates that already carry a timezone are stored without shifting', function () {
    expect(Product::manilaDateTimeToUtc(Carbon::parse('2026-09-27 08:58:00', 'UTC')))->toBe('2026-09-27 08:58:00')
        ->and(Product::manilaDateTimeToUtc('2026-09-27T16:58'))->toBe('2026-09-27 08:58:00')
        ->and(Product::manilaDateTimeToUtc(''))->toBeNull()
        ->and(Product::manilaDateTimeToUtc(null))->toBeNull();
});

test('the catalog preorder banner gets the days left to preorder', function () {
    Carbon::setTestNow(Carbon::parse('2026-09-27 09:00:00', 'UTC'));

    $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    $product = preorderTimezoneTestProduct($admin);
    $product->update([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'expected_release_date' => '2026-10-05',
        'preorder_enabled' => true,
        'preorder_starts_at' => Carbon::parse('2026-09-27 08:00:00', 'UTC'),
        'preorder_ends_at' => Carbon::parse('2026-10-02 09:00:00', 'UTC'),
    ]);

    $student = User::factory()->create(['role' => 'student', 'is_active' => true]);

    $this->actingAs($student)
        ->get('/catalog')
        ->assertInertia(fn (Assert $page) => $page
            ->where('comingSoonProducts.0.id', $product->id)
            ->where('comingSoonProducts.0.accepts_preorders', true)
            ->where('comingSoonProducts.0.preorder_days_remaining', 5));
});
