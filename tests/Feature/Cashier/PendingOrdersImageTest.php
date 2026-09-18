<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function pendingOrdersImageTestCashier(): User
{
    return User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);
}

function pendingOrdersImageTestStudent(): User
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

function pendingOrdersImageTestVariant(?string $imagePath = null)
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
        'base_price' => 500.00,
        'image_path' => $imagePath,
        'is_active' => true,
    ]);

    return $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => 'STD',
        'is_active' => true,
    ]);
}

function pendingOrdersImageTestOrder(Student $student, User $creator, $variant): Order
{
    $order = Order::query()->create([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $creator->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PENDING,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => '500.00',
        'total' => '500.00',
        'qr_token' => Str::random(64),
    ]);

    $order->items()->create([
        'product_variant_id' => $variant->id,
        'product_code' => $variant->product->code,
        'product_name' => $variant->product->name,
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => 'order',
        'quantity' => 1,
        'unit_price' => '500.00',
        'line_total' => '500.00',
    ]);

    return $order;
}

test('a pending order reports its first items product image', function () {
    $cashier = pendingOrdersImageTestCashier();
    $studentUser = pendingOrdersImageTestStudent();
    $variant = pendingOrdersImageTestVariant('products/test-image.jpg');
    $order = pendingOrdersImageTestOrder($studentUser->student, $studentUser, $variant);

    $response = $this->actingAs($cashier)->get('/cashier/orders');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('cashier/Orders/Index')
        ->where('orders.0.id', $order->id)
        ->where('orders.0.image_url', '/storage/products/test-image.jpg'),
    );
});

test('a pending order without a product image reports null instead of erroring', function () {
    $cashier = pendingOrdersImageTestCashier();
    $studentUser = pendingOrdersImageTestStudent();
    $variant = pendingOrdersImageTestVariant(null);
    $order = pendingOrdersImageTestOrder($studentUser->student, $studentUser, $variant);

    $response = $this->actingAs($cashier)->get('/cashier/orders');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('cashier/Orders/Index')
        ->where('orders.0.id', $order->id)
        ->where('orders.0.image_url', null),
    );
});
