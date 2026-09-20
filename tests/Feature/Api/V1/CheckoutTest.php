<?php

use App\Models\CartItem;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\CartService;
use Laravel\Sanctum\Sanctum;

function apiCheckoutFill(User $student, $variant, int $quantity): CartItem
{
    app(CartService::class)->addForStudent($student, $variant, $quantity);

    return CartItem::query()
        ->where('product_variant_id', $variant->id)
        ->latest('id')
        ->firstOrFail();
}

function apiCheckoutAs(User $student): void
{
    Sanctum::actingAs($student, ['student']);
}

function apiCheckoutPreorderVariant()
{
    $variant = makeVariantWithStock(10, 0);

    $variant->product->forceFill([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_limit_per_student' => 5,
    ])->save();

    return $variant->fresh();
}

test('checkout needs a signed-in student', function () {
    $this->postJson('/api/v1/checkout', [])->assertUnauthorized();

    Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]), ['student']);

    $this->postJson('/api/v1/checkout', [])->assertUnauthorized();
});

test('a cash checkout creates the order and returns it with the refreshed cart', function () {
    $cashier = User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]);
    $student = makeStudentAccount();
    $item = apiCheckoutFill($student, makeVariantWithStock(10, 0), 2);
    apiCheckoutAs($student);

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$item->id],
    ])
        ->assertCreated()
        ->assertJsonPath('message', 'Your order has been placed successfully. Show your Payment QR to the cashier and pay in cash.')
        ->assertJsonPath('data.order.payment_method', 'cash')
        ->assertJsonPath('data.order.payment_status', Order::PAYMENT_PENDING)
        ->assertJsonPath('data.order.total', '200.00')
        ->assertJsonPath('data.cart.total_quantity', 0)
        ->assertJsonPath('data.cart.items', []);

    $order = Order::query()->firstOrFail();

    expect($order->student_id)->toBe($student->student->id)
        ->and($order->source)->toBe(Order::SOURCE_STUDENT_APP)
        ->and(Notification::query()
            ->where('user_id', $cashier->id)
            ->where('type', Notification::TYPE_ORDER_PENDING_PAYMENT)
            ->exists())->toBeTrue();
});

test('a gcash checkout records the reference in capital letters', function () {
    $student = makeStudentAccount();
    $item = apiCheckoutFill($student, makeVariantWithStock(10, 0), 1);
    apiCheckoutAs($student);

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'gcash',
        'payment_reference' => ' abc123456 ',
        'item_ids' => [$item->id],
    ])
        ->assertCreated()
        ->assertJsonPath('message', 'Your order has been placed successfully. Your online payment reference was recorded and is waiting for cashier verification.');

    expect(Order::query()->firstOrFail()->payment_reference)->toBe('ABC123456');
});

test('checkout uses the website messages for a missing reference and confirmation', function () {
    $student = makeStudentAccount();
    $item = apiCheckoutFill($student, makeVariantWithStock(10, 0), 1);
    apiCheckoutAs($student);

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'maya',
        'item_ids' => [$item->id],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.payment_reference.0', 'The transaction/reference number is required for GCash or Maya.');

    $this->postJson('/api/v1/checkout', [
        'confirmed' => false,
        'payment_method' => 'cash',
        'item_ids' => [$item->id],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.confirmed.0', 'Please confirm that you reviewed your order before submitting it.');

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.item_ids.0', 'Please select at least one cart item.');

    expect(Order::query()->count())->toBe(0);
});

test('a reference number already used for another order is refused', function () {
    $first = makeStudentAccount();
    $firstItem = apiCheckoutFill($first, makeVariantWithStock(10, 0), 1);
    apiCheckoutAs($first);

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'gcash',
        'payment_reference' => 'REF-000001',
        'item_ids' => [$firstItem->id],
    ])->assertCreated();

    $second = makeStudentAccount();
    $secondItem = apiCheckoutFill($second, makeVariantWithStock(10, 0), 1);
    apiCheckoutAs($second);

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'gcash',
        'payment_reference' => 'ref-000001',
        'item_ids' => [$secondItem->id],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.payment_reference.0', 'This transaction/reference number has already been used for another order.');
});

test('normal and preorder items cannot be checked out together', function () {
    $student = makeStudentAccount();
    $normal = apiCheckoutFill($student, makeVariantWithStock(10, 0), 1);
    $preorder = apiCheckoutFill($student, apiCheckoutPreorderVariant(), 1);
    apiCheckoutAs($student);

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$normal->id, $preorder->id],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.checkout.0', 'Normal merchandise and preorder merchandise cannot be submitted together.');

    expect(Order::query()->count())->toBe(0);
});

test('a preorder checkout needs no payment and does not notify the cashiers', function () {
    $cashier = User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]);
    $student = makeStudentAccount();
    $item = apiCheckoutFill($student, apiCheckoutPreorderVariant(), 2);
    apiCheckoutAs($student);

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'item_ids' => [$item->id],
    ])
        ->assertCreated()
        ->assertJsonPath('data.order.order_type', Order::TYPE_PREORDER)
        ->assertJsonPath('data.order.payment_method', null);

    expect(Notification::query()->where('user_id', $cashier->id)->count())->toBe(0);
});

test('only the selected items are checked out and the rest stay in the cart', function () {
    $student = makeStudentAccount();
    $checkedOut = apiCheckoutFill($student, makeVariantWithStock(10, 0), 1);
    $kept = apiCheckoutFill($student, makeVariantWithStock(10, 0), 3);
    apiCheckoutAs($student);

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$checkedOut->id],
    ])
        ->assertCreated()
        ->assertJsonPath('data.cart.total_quantity', 3)
        ->assertJsonCount(1, 'data.cart.items')
        ->assertJsonPath('data.cart.items.0.id', $kept->id);
});

test('stock that ran out since it was added to the cart is refused', function () {
    $student = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);
    $item = apiCheckoutFill($student, $variant, 4);
    $variant->inventory->update(['quantity_on_hand' => 2]);
    apiCheckoutAs($student);

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$item->id],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.cart.0', 'Standard only has 2 unit(s) available. Your cart currently requests 4 unit(s). Please update your cart before checking out.');

    expect(Order::query()->count())->toBe(0);
});

test('a student cannot check out items from another students cart', function () {
    $owner = makeStudentAccount();
    $ownersItem = apiCheckoutFill($owner, makeVariantWithStock(10, 0), 1);

    apiCheckoutAs(makeStudentAccount());

    $this->postJson('/api/v1/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$ownersItem->id],
    ])->assertUnprocessable();

    expect(Order::query()->count())->toBe(0)
        ->and($ownersItem->fresh())->not->toBeNull();
});
