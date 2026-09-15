<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use App\Services\CheckoutService;
use Illuminate\Support\Str;

function checkoutTaxTestStudent(): User
{
    $user = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    Student::query()->create([
        'user_id' => $user->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    return $user->fresh('student');
}

function checkoutTaxTestCartItem(Student $student, User $creator, float $unitPrice, int $quantity): CartItem
{
    $admin = User::factory()->create(['role' => 'admin']);

    $category = Category::query()->create([
        'name' => 'Category '.Str::random(8),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'Test Product',
        'base_price' => $unitPrice,
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
        'quantity_on_hand' => 100,
        'quantity_reserved' => 0,
        'reorder_level' => 5,
    ]);

    $cart = Cart::query()->create([
        'student_id' => $student->id,
        'created_by' => $creator->id,
        'source' => Cart::SOURCE_STUDENT_APP,
        'status' => Cart::STATUS_ACTIVE,
    ]);

    return CartItem::query()->create([
        'cart_id' => $cart->id,
        'product_variant_id' => $variant->id,
        'item_type' => CartItem::TYPE_ORDER,
        'quantity' => $quantity,
        'unit_price' => number_format($unitPrice, 2, '.', ''),
    ]);
}

test('checkout records a vat-inclusive tax breakdown without changing the total charged', function () {
    $studentUser = checkoutTaxTestStudent();
    $cartItem = checkoutTaxTestCartItem($studentUser->student, $studentUser, 500.00, 1);

    $order = app(CheckoutService::class)->checkoutForStudent(
        $studentUser,
        [$cartItem->id],
    );

    expect((float) $order->total)->toBe(500.00);
    expect((float) $order->subtotal)->toBe(500.00);

    expect((float) $order->tax_rate)->toBe(12.00);

    // 500 * (0.12 / 1.12) = 53.57
    expect((float) $order->tax_amount)->toBe(53.57);

    // 500 - 53.57 = 446.43
    expect((float) $order->vatableSales())->toBe(446.43);

    // The disclosed breakdown must always reconstruct the same total.
    expect(
        round(
            (float) $order->tax_amount + (float) $order->vatableSales(),
            2,
        ),
    )->toBe((float) $order->total);
});

test('the tax breakdown scales correctly with a different order amount', function () {
    $studentUser = checkoutTaxTestStudent();
    $cartItem = checkoutTaxTestCartItem($studentUser->student, $studentUser, 250.00, 3);

    $order = app(CheckoutService::class)->checkoutForStudent(
        $studentUser,
        [$cartItem->id],
    );

    // 3 x 250 = 750, unchanged by tax.
    expect((float) $order->total)->toBe(750.00);

    // 750 * (0.12 / 1.12) = 80.36
    expect((float) $order->tax_amount)->toBe(80.36);

    expect(
        round(
            (float) $order->tax_amount + (float) $order->vatableSales(),
            2,
        ),
    )->toBe((float) $order->total);
});

test('the order receipt discloses the tax breakdown for a paid order', function () {
    $studentUser = checkoutTaxTestStudent();
    $cartItem = checkoutTaxTestCartItem($studentUser->student, $studentUser, 500.00, 1);

    $order = app(CheckoutService::class)->checkoutForStudent(
        $studentUser,
        [$cartItem->id],
    );

    $order->forceFill([
        'payment_status' => Order::PAYMENT_PAID,
        'paid_at' => now(),
        'payment_method' => 'cash',
    ])->save();

    $response = $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}/receipt");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('receipts/Show')
        ->where('order.total', '500.00')
        ->where('order.tax_amount', '53.57')
        ->where('order.vatable_sales', '446.43'),
    );
});
