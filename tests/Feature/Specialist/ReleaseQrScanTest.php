<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function makeSpecialist(): User
{
    return User::factory()->create([
        'role' => 'specialist',
        'is_active' => true,
    ]);
}

function makeStudentAccount(): User
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

function makeVariantWithStock(int $quantityOnHand, int $quantityReserved): ProductVariant
{
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $category = Category::query()->create([
        'name' => 'Category '.Str::random(8),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'Test Product',
        'base_price' => 100,
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
        'quantity_reserved' => $quantityReserved,
        'reorder_level' => 5,
    ]);

    return $variant->fresh('inventory');
}

function makePaidOrderWithItem(
    Student $student,
    User $creator,
    ProductVariant $variant,
    int $quantity,
    array $overrides = [],
): Order {
    $order = Order::query()->create(array_merge([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $creator->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PAID,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => number_format(100 * $quantity, 2, '.', ''),
        'total' => number_format(100 * $quantity, 2, '.', ''),
        'qr_token' => Str::random(64),
        'payment_method' => 'cash',
        'paid_at' => now(),
        'release_qr_token' => Str::random(64),
    ], $overrides));

    OrderItem::query()->create([
        'order_id' => $order->id,
        'product_variant_id' => $variant->id,
        'product_code' => 'PRD-CODE',
        'product_name' => 'Test Product',
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_ORDER,
        'quantity' => $quantity,
        'unit_price' => '100.00',
        'line_total' => number_format(100 * $quantity, 2, '.', ''),
    ]);

    return $order->fresh('items');
}

test('specialist can scan a valid release qr and it marks the qr as used', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2);

    expect($order->release_qr_used_at)->toBeNull();

    $response = $this->actingAs($specialist)
        ->get("/specialist/orders/scan/{$order->release_qr_token}");

    $response->assertOk();

    $order->refresh();

    expect($order->release_qr_used_at)->not->toBeNull();
});

test('scanning an unknown release qr token redirects with an error', function () {
    $specialist = makeSpecialist();

    $response = $this->actingAs($specialist)
        ->get('/specialist/orders/scan/'.Str::random(64));

    $response->assertRedirect(route('specialist.orders.index'));
    $response->assertSessionHas('error');
});

test('scanning a cancelled order release qr fails', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'payment_status' => Order::PAYMENT_CANCELLED,
        'cancelled_at' => now(),
    ]);

    $response = $this->actingAs($specialist)
        ->get("/specialist/orders/scan/{$order->release_qr_token}");

    $response->assertRedirect(route('specialist.orders.index'));
    $response->assertSessionHas('error');

    $order->refresh();

    expect($order->release_qr_used_at)->toBeNull();
});

test('scanning an unpaid order release qr fails', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'payment_status' => Order::PAYMENT_PENDING,
        'paid_at' => null,
    ]);

    $response = $this->actingAs($specialist)
        ->get("/specialist/orders/scan/{$order->release_qr_token}");

    $response->assertRedirect(route('specialist.orders.index'));
    $response->assertSessionHas('error');

    $order->refresh();

    expect($order->release_qr_used_at)->toBeNull();
});

test('scanning an already released order release qr fails', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now(),
        'release_qr_used_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($specialist)
        ->get("/specialist/orders/scan/{$order->release_qr_token}");

    $response->assertRedirect(route('specialist.orders.index'));
    $response->assertSessionHas('error');
});

test('a release qr can only be scanned once', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2);

    $this->actingAs($specialist)
        ->get("/specialist/orders/scan/{$order->release_qr_token}")
        ->assertOk();

    $order->refresh();
    $firstScanTimestamp = $order->release_qr_used_at;

    expect($firstScanTimestamp)->not->toBeNull();

    $response = $this->actingAs($specialist)
        ->get("/specialist/orders/scan/{$order->release_qr_token}");

    $response->assertRedirect(route('specialist.orders.index'));
    $response->assertSessionHas('error');

    $order->refresh();

    expect(
        $order->release_qr_used_at->equalTo($firstScanTimestamp),
    )->toBeTrue();
});

test('a non-specialist cannot scan a release qr', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2);

    $response = $this->actingAs($studentUser)
        ->get("/specialist/orders/scan/{$order->release_qr_token}");

    $response->assertForbidden();

    $order->refresh();

    expect($order->release_qr_used_at)->toBeNull();
});
