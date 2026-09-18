<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function paymentHistoryTestCashier(): User
{
    return User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);
}

function paymentHistoryTestVariant()
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
        'base_price' => 250.00,
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

test('payment history reports the purchased items and fulfillment timeline for each transaction', function () {
    $cashier = paymentHistoryTestCashier();
    $variant = paymentHistoryTestVariant();

    $studentUser = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    $student = Student::query()->create([
        'user_id' => $studentUser->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    $order = Order::query()->create([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $studentUser->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PAID,
        'fulfillment_status' => Order::FULFILLMENT_READY,
        'subtotal' => '500.00',
        'total' => '500.00',
        'qr_token' => Str::random(64),
        'payment_method' => 'cash',
        'transaction_number' => 'TXN-TEST-000001',
        'paid_at' => now(),
        'payment_confirmed_by' => $cashier->id,
    ]);

    $order->forceFill([
        'ready_for_release_at' => now(),
    ])->save();

    $order->items()->create([
        'product_variant_id' => $variant->id,
        'product_code' => $variant->product->code,
        'product_name' => $variant->product->name,
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => 'order',
        'quantity' => 2,
        'unit_price' => '250.00',
        'line_total' => '500.00',
    ]);

    $response = $this->actingAs($cashier)->get('/cashier/payments');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('cashier/Payments/Index')
        ->where('payments.data.0.items.0.product_name', $variant->product->name)
        ->where('payments.data.0.items.0.quantity', 2)
        ->where('payments.data.0.items.0.line_total', '500.00')
        ->where('payments.data.0.fulfillment_status', Order::FULFILLMENT_READY)
        ->where('payments.data.0.released_at', null)
        ->where(
            'payments.data.0.ready_for_release_at',
            fn ($value) => $value !== null,
        ),
    );
});
