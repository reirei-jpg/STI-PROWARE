<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\CartService;

function webCheckoutFill(User $student, $variant, int $quantity): CartItem
{
    app(CartService::class)->addForStudent($student, $variant, $quantity);

    return CartItem::query()
        ->where('product_variant_id', $variant->id)
        ->latest('id')
        ->firstOrFail();
}

function webCheckoutPreorderVariant()
{
    $variant = makeVariantWithStock(10, 0);

    $variant->product->forceFill([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'preorder_limit_per_student' => 5,
    ])->save();

    return $variant->fresh();
}

function webCheckoutCashier(): User
{
    return User::factory()->create([
        'role' => User::ROLE_CASHIER,
        'is_active' => true,
    ]);
}

test('the checkout page lists only the selected cart items', function () {
    $student = makeStudentAccount();
    $first = webCheckoutFill($student, makeVariantWithStock(10, 0), 2);
    webCheckoutFill($student, makeVariantWithStock(10, 0), 1);

    $this->actingAs($student)
        ->get("/checkout?items={$first->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('checkout/Index')
            ->where('cart.total_quantity', 2)
            ->where('cart.subtotal', '200.00')
            ->has('cart.items', 1)
            ->where('cart.items.0.id', $first->id),
        );
});

test('the checkout page sends the student back when nothing is selected', function () {
    $student = makeStudentAccount();
    webCheckoutFill($student, makeVariantWithStock(10, 0), 1);

    $this->actingAs($student)
        ->get('/checkout')
        ->assertRedirect('/cart')
        ->assertSessionHas('error', 'Please select at least one cart item.');
});

test('the checkout page refuses a mix of normal and preorder items', function () {
    $student = makeStudentAccount();
    $normal = webCheckoutFill($student, makeVariantWithStock(10, 0), 1);
    $preorder = webCheckoutFill($student, webCheckoutPreorderVariant(), 1);

    $this->actingAs($student)
        ->get("/checkout?items={$normal->id},{$preorder->id}")
        ->assertRedirect('/cart')
        ->assertSessionHas('error', 'Normal merchandise and preorder merchandise cannot be submitted together.');
});

test('a cash checkout creates the order, notifies the cashiers and empties the cart', function () {
    $cashier = webCheckoutCashier();
    $student = makeStudentAccount();
    $item = webCheckoutFill($student, makeVariantWithStock(10, 0), 2);

    $response = $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$item->id],
    ]);

    $order = Order::query()->firstOrFail();

    $response
        ->assertRedirect(route('student.orders.show', $order))
        ->assertSessionHas('success', 'Your order has been placed successfully. Show your Payment QR to the cashier and pay in cash.');

    expect($order->payment_method)->toBe('cash')
        ->and($order->payment_reference)->toBeNull()
        ->and($order->payment_status)->toBe(Order::PAYMENT_PENDING)
        ->and((float) $order->total)->toBe(200.0)
        ->and(CartItem::query()->count())->toBe(0)
        ->and(Cart::query()->first()->status)->toBe(Cart::STATUS_CHECKED_OUT);

    $notification = Notification::query()
        ->where('user_id', $cashier->id)
        ->where('type', Notification::TYPE_ORDER_PENDING_PAYMENT)
        ->firstOrFail();

    expect($notification->message)->toContain($student->name)
        ->toContain($order->order_number)
        ->toContain('CASH');
});

test('a gcash checkout records the reference in capital letters', function () {
    $student = makeStudentAccount();
    $item = webCheckoutFill($student, makeVariantWithStock(10, 0), 1);

    $response = $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'gcash',
        'payment_reference' => '  abc123456  ',
        'item_ids' => [$item->id],
    ]);

    $order = Order::query()->firstOrFail();

    $response
        ->assertRedirect(route('student.orders.show', $order))
        ->assertSessionHas('success', 'Your order has been placed successfully. Your online payment reference was recorded and is waiting for cashier verification.');

    expect($order->payment_method)->toBe('gcash')
        ->and($order->payment_reference)->toBe('ABC123456');
});

test('gcash and maya need a reference number', function () {
    $student = makeStudentAccount();
    $item = webCheckoutFill($student, makeVariantWithStock(10, 0), 1);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'maya',
        'payment_reference' => '',
        'item_ids' => [$item->id],
    ])->assertSessionHasErrors(['payment_reference' => 'The transaction/reference number is required for GCash or Maya.']);

    expect(Order::query()->count())->toBe(0)
        ->and(CartItem::query()->count())->toBe(1);
});

test('a short reference number is refused', function () {
    $student = makeStudentAccount();
    $item = webCheckoutFill($student, makeVariantWithStock(10, 0), 1);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'gcash',
        'payment_reference' => 'ABC',
        'item_ids' => [$item->id],
    ])->assertSessionHasErrors(['payment_reference' => 'The transaction/reference number is too short.']);
});

test('a reference number already used for another order is refused', function () {
    $first = makeStudentAccount();
    $firstItem = webCheckoutFill($first, makeVariantWithStock(10, 0), 1);

    $this->actingAs($first)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'gcash',
        'payment_reference' => 'REF-000001',
        'item_ids' => [$firstItem->id],
    ]);

    $second = makeStudentAccount();
    $secondItem = webCheckoutFill($second, makeVariantWithStock(10, 0), 1);

    $this->actingAs($second)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'gcash',
        'payment_reference' => 'ref-000001',
        'item_ids' => [$secondItem->id],
    ])->assertSessionHasErrors(['payment_reference' => 'This transaction/reference number has already been used for another order.']);

    expect(Order::query()->count())->toBe(1);
});

test('an unknown payment method is refused', function () {
    $student = makeStudentAccount();
    $item = webCheckoutFill($student, makeVariantWithStock(10, 0), 1);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'paypal',
        'item_ids' => [$item->id],
    ])->assertSessionHasErrors(['payment_method' => 'The selected payment method is invalid.']);
});

test('a checkout without the review confirmation is refused', function () {
    $student = makeStudentAccount();
    $item = webCheckoutFill($student, makeVariantWithStock(10, 0), 1);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => false,
        'payment_method' => 'cash',
        'item_ids' => [$item->id],
    ])->assertSessionHasErrors(['confirmed' => 'Please confirm that you reviewed your order before submitting it.']);

    expect(Order::query()->count())->toBe(0);
});

test('a checkout with no items selected is refused', function () {
    $student = makeStudentAccount();
    webCheckoutFill($student, makeVariantWithStock(10, 0), 1);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [],
    ])->assertSessionHasErrors(['item_ids' => 'Please select at least one cart item.']);
});

test('normal and preorder items cannot be checked out together', function () {
    $student = makeStudentAccount();
    $normal = webCheckoutFill($student, makeVariantWithStock(10, 0), 1);
    $preorder = webCheckoutFill($student, webCheckoutPreorderVariant(), 1);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$normal->id, $preorder->id],
    ])->assertSessionHasErrors(['checkout' => 'Normal merchandise and preorder merchandise cannot be submitted together.']);

    expect(Order::query()->count())->toBe(0);
});

test('a preorder checkout needs no payment and does not notify the cashiers', function () {
    $cashier = webCheckoutCashier();
    $student = makeStudentAccount();
    $item = webCheckoutFill($student, webCheckoutPreorderVariant(), 2);

    $response = $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'item_ids' => [$item->id],
    ]);

    $order = Order::query()->firstOrFail();

    $response
        ->assertRedirect(route('student.orders.show', $order))
        ->assertSessionHas('success', 'Your preorder has been submitted successfully. No payment is required yet. You will be notified when stock becomes available and your preorder is ready for payment.');

    expect($order->payment_method)->toBeNull()
        ->and($order->payment_reference)->toBeNull()
        ->and($order->order_type)->toBe(Order::TYPE_PREORDER)
        ->and(Notification::query()->where('user_id', $cashier->id)->count())->toBe(0);
});

test('preorder checkout enforces the total capacity across students', function () {
    $variant = webCheckoutPreorderVariant();
    $variant->product->forceFill(['preorder_capacity' => 3])->save();

    $studentA = makeStudentAccount();
    $itemA = webCheckoutFill($studentA, $variant, 3);

    $this->actingAs($studentA)->post('/checkout', [
        'confirmed' => true,
        'item_ids' => [$itemA->id],
    ])->assertSessionHasNoErrors();

    expect(Order::query()->count())->toBe(1);

    /*
     * Insert the second student's cart item directly, bypassing
     * CartService's own best-effort check, to prove CheckoutService's
     * authoritative, locked check blocks the over-capacity preorder
     * entirely on its own.
     */
    $studentB = makeStudentAccount();
    $cartB = Cart::create([
        'student_id' => $studentB->student->id,
        'created_by' => $studentB->id,
        'source' => Cart::SOURCE_STUDENT_APP,
        'status' => Cart::STATUS_ACTIVE,
    ]);
    $itemB = CartItem::create([
        'cart_id' => $cartB->id,
        'product_variant_id' => $variant->id,
        'item_type' => CartItem::TYPE_PREORDER,
        'quantity' => 1,
        'unit_price' => $variant->selling_price,
    ]);

    $this->actingAs($studentB)->post('/checkout', [
        'confirmed' => true,
        'item_ids' => [$itemB->id],
    ])->assertSessionHasErrors([
        'cart' => "Only 0 preorder slot(s) remain for {$variant->product->name}. Please reduce your quantity.",
    ]);

    expect(Order::query()->count())->toBe(1);
});

test('preorder checkout enforces the per-student limit across separate orders', function () {
    $variant = webCheckoutPreorderVariant(); // preorder_limit_per_student = 5
    $student = makeStudentAccount();

    $firstItem = webCheckoutFill($student, $variant, 3);
    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'item_ids' => [$firstItem->id],
    ])->assertSessionHasNoErrors();

    expect(Order::query()->count())->toBe(1);

    $cart = Cart::create([
        'student_id' => $student->student->id,
        'created_by' => $student->id,
        'source' => Cart::SOURCE_STUDENT_APP,
        'status' => Cart::STATUS_ACTIVE,
    ]);
    $secondItem = CartItem::create([
        'cart_id' => $cart->id,
        'product_variant_id' => $variant->id,
        'item_type' => CartItem::TYPE_PREORDER,
        'quantity' => 3,
        'unit_price' => $variant->selling_price,
    ]);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'item_ids' => [$secondItem->id],
    ])->assertSessionHasErrors([
        'cart' => "{$variant->product->name} allows a maximum preorder quantity of 5 unit(s) per student for this batch. You already have 3 unit(s), so you may add up to 2 more.",
    ]);

    expect(Order::query()->count())->toBe(1);
});

test('the per-student preorder limit resets when a new preorder window opens', function () {
    $variant = webCheckoutPreorderVariant(); // preorder_limit_per_student = 5
    $student = makeStudentAccount();

    $firstItem = webCheckoutFill($student, $variant, 5);
    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'item_ids' => [$firstItem->id],
    ])->assertSessionHasNoErrors();

    Order::query()->firstOrFail()->forceFill(['created_at' => now()->subDays(30)])->save();

    // A brand-new preorder batch opens for the same product.
    $variant->product->forceFill([
        'preorder_starts_at' => now()->subDay(),
        'preorder_ends_at' => now()->addDays(10),
    ])->save();

    $secondItem = webCheckoutFill($student, $variant, 5);
    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'item_ids' => [$secondItem->id],
    ])->assertSessionHasNoErrors();

    expect(Order::query()->count())->toBe(2);
});

test('only the selected items are checked out and the rest stay in the cart', function () {
    $student = makeStudentAccount();
    $checkedOut = webCheckoutFill($student, makeVariantWithStock(10, 0), 1);
    $kept = webCheckoutFill($student, makeVariantWithStock(10, 0), 3);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$checkedOut->id],
    ]);

    expect(CartItem::query()->pluck('id')->all())->toBe([$kept->id])
        ->and(Cart::query()->first()->status)->toBe(Cart::STATUS_ACTIVE)
        ->and(Order::query()->firstOrFail()->items()->count())->toBe(1);
});

test('checking out reserves the stock', function () {
    $student = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);
    $item = webCheckoutFill($student, $variant, 4);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$item->id],
    ]);

    expect($variant->inventory->fresh()->quantity_reserved)->toBe(4);
});

test('stock that ran out since it was added to the cart is refused', function () {
    $student = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);
    $item = webCheckoutFill($student, $variant, 4);

    $variant->inventory->update(['quantity_on_hand' => 2]);

    $this->actingAs($student)->post('/checkout', [
        'confirmed' => true,
        'payment_method' => 'cash',
        'item_ids' => [$item->id],
    ])->assertSessionHasErrors(['cart' => 'Standard only has 2 unit(s) available. Your cart currently requests 4 unit(s). Please update your cart before checking out.']);

    expect(Order::query()->count())->toBe(0)
        ->and($item->fresh())->not->toBeNull();
});

test('only a student can check out', function () {
    $this->actingAs(webCheckoutCashier())
        ->post('/checkout', [
            'confirmed' => true,
            'payment_method' => 'cash',
            'item_ids' => [1],
        ])
        ->assertForbidden();
});
