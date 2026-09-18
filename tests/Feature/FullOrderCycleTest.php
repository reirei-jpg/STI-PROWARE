<?php

use App\Models\AuditLog;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| Full Order Lifecycle — One Complete Cycle
|--------------------------------------------------------------------------
|
| Walks the entire real-world path a single transaction takes through
| the system, exactly as a physical QR scan / cashier confirm / specialist
| release would, using the actual shared routes (not internal shortcuts):
|
| 1. Student adds a product to their cart.
| 2. Student checks out -> Order created, Payment QR generated,
|    cashiers notified.
| 3. Cashier scans the Payment QR (shared /orders/scan/{token} entry
|    point, the same one a real camera scan hits).
| 4. Cashier confirms payment -> Release QR generated, student and
|    specialists notified.
| 5. Receipt is viewable by both the cashier and the student.
| 6. Specialist scans the Release QR (same shared entry point).
| 7. Specialist marks the order ready for pickup -> student notified.
| 8. Specialist releases the order -> physical inventory decremented,
|    a StockMovement is recorded, student notified.
| 9. The finished transaction is visible in Payment History, in the
|    Sales report's totals, and on the student's own order page.
*/
test('one full order cycle works end to end: cart -> checkout -> payment -> release', function () {
    /*
    |--------------------------------------------------------------------------
    | Setup: Actors
    |--------------------------------------------------------------------------
    */

    $admin = User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);

    $studentUser = User::factory()->create([
        'name' => 'Jezreel Rei Dasigan',
        'email' => 'dasigan.361070@example.com',
        'role' => 'student',
        'is_active' => true,
    ]);

    $student = Student::query()->create([
        'user_id' => $studentUser->id,
        'student_id' => '361070',
        'course' => 'BSIT',
        'year_level' => '3',
        'status' => 'active',
    ]);

    $studentUser = $studentUser->fresh('student');

    $cashier = User::factory()->create([
        'name' => 'Test Cashier',
        'role' => 'cashier',
        'is_active' => true,
    ]);

    $specialist = User::factory()->create([
        'name' => 'Test Specialist',
        'role' => 'specialist',
        'is_active' => true,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Setup: Product In Stock
    |--------------------------------------------------------------------------
    */

    $category = Category::query()->create([
        'name' => 'Uniforms',
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'PROWARE Test Polo Shirt',
        'base_price' => 450.00,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'is_active' => true,
    ]);

    $variant = $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'size' => 'M',
        'variant_name' => 'Medium',
        'variant_key' => 'M',
        'is_active' => true,
    ]);

    $inventory = $variant->inventory()->create([
        'quantity_on_hand' => 10,
        'quantity_reserved' => 0,
        'reorder_level' => 2,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Step 1: Student Adds To Cart
    |--------------------------------------------------------------------------
    */

    $this->actingAs($studentUser)
        ->post('/cart/items', [
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ])
        ->assertSessionDoesntHaveErrors();

    $cart = Cart::query()
        ->where('student_id', $student->id)
        ->where('status', Cart::STATUS_ACTIVE)
        ->first();

    $cartItem = $cart?->items()->first();

    expect($cartItem)->not->toBeNull();
    expect($cartItem->quantity)->toBe(2);

    /*
    |--------------------------------------------------------------------------
    | Step 2: Student Checks Out (Cash)
    |--------------------------------------------------------------------------
    */

    $this->actingAs($studentUser)
        ->post('/checkout', [
            'confirmed' => true,
            'item_ids' => [$cartItem->id],
            'payment_method' => 'cash',
        ])
        ->assertSessionDoesntHaveErrors();

    $order = Order::query()->latest()->first();

    expect($order)->not->toBeNull();
    expect($order->payment_status)->toBe(Order::PAYMENT_PENDING);
    expect($order->payment_method)->toBe('cash');
    expect($order->qr_token)->not->toBeNull();
    expect((float) $order->total)->toBe(900.00); // 450 x 2

    // Cashiers were notified that a new order needs confirmation.
    expect(
        Notification::query()
            ->where('user_id', $cashier->id)
            ->where('type', Notification::TYPE_ORDER_PENDING_PAYMENT)
            ->count(),
    )->toBe(1);

    /*
    |--------------------------------------------------------------------------
    | Step 3: The Payment QR Image Actually Generates
    |--------------------------------------------------------------------------
    */

    $qrResponse = $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}/qr");

    $qrResponse->assertOk();
    $qrResponse->assertHeader('Content-Type', 'image/png');

    /*
    |--------------------------------------------------------------------------
    | Step 4: Cashier Scans The Payment QR
    |--------------------------------------------------------------------------
    |
    | Uses the real shared scan entry point (/orders/scan/{token}),
    | exactly like a physical QR-code scan would hit. That entry
    | point only redirects into the role-specific scanner, which
    | performs the actual one-time consumption, so that one real
    | hop is followed manually (rather than all the way to the
    | final page render, where Laravel's test session helper no
    | longer reliably reflects the intermediate flash message).
    */

    $sharedScan = $this->actingAs($cashier)
        ->get("/orders/scan/{$order->qr_token}");

    $sharedScan->assertRedirect();

    $this->actingAs($cashier)
        ->get($sharedScan->headers->get('Location'))
        ->assertSessionHas('success');

    $order->refresh();
    expect($order->payment_qr_used_at)->not->toBeNull();

    expect(
        AuditLog::query()
            ->where('action', 'payment_qr_scanned')
            ->count(),
    )->toBe(1);

    /*
    |--------------------------------------------------------------------------
    | Step 5: Cashier Confirms Payment
    |--------------------------------------------------------------------------
    */

    $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment")
        ->assertSessionHas('success');

    $order->refresh();
    expect($order->payment_status)->toBe(Order::PAYMENT_PAID);
    expect($order->transaction_number)->not->toBeNull();
    expect($order->transaction_number)->toStartWith('TXN-');
    expect($order->release_qr_token)->not->toBeNull();
    expect($order->payment_confirmed_by)->toBe($cashier->id);

    // Student notified payment is confirmed; specialists notified to fulfill.
    expect(
        Notification::query()
            ->where('user_id', $studentUser->id)
            ->where('type', Notification::TYPE_PAYMENT_CONFIRMED)
            ->count(),
    )->toBe(1);

    expect(
        Notification::query()
            ->where('user_id', $specialist->id)
            ->where('type', Notification::TYPE_ORDER_READY_FOR_FULFILLMENT)
            ->count(),
    )->toBe(1);

    /*
    |--------------------------------------------------------------------------
    | Step 6: Receipt Is Viewable By Both Cashier And Student
    |--------------------------------------------------------------------------
    */

    $this->actingAs($cashier)
        ->get("/cashier/orders/{$order->id}/receipt")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('receipts/Show')
            ->where('order.transaction_number', $order->transaction_number)
            ->where('order.total', '900.00'),
        );

    $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}/receipt")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('receipts/Show')
            ->where('order.transaction_number', $order->transaction_number),
        );

    /*
    |--------------------------------------------------------------------------
    | Step 7: Specialist Scans The Release QR
    |--------------------------------------------------------------------------
    */

    $sharedReleaseScan = $this->actingAs($specialist)
        ->get("/orders/scan/{$order->release_qr_token}");

    $sharedReleaseScan->assertRedirect();

    /*
     * Unlike the Cashier's scan (which redirects with a flash
     * message, then loads the order page in a separate request),
     * the Specialist's scan renders the verification page
     * directly in this same request — no flash message, just a
     * 200 with the order data.
     */
    $this->actingAs($specialist)
        ->get($sharedReleaseScan->headers->get('Location'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('specialist/Orders/Verify')
            ->where('order.id', $order->id),
        );

    $order->refresh();
    expect($order->release_qr_used_at)->not->toBeNull();

    /*
    |--------------------------------------------------------------------------
    | Step 8: Specialist Marks The Order Ready For Pickup
    |--------------------------------------------------------------------------
    */

    $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/ready")
        ->assertSessionDoesntHaveErrors();

    $order->refresh();
    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_READY);
    expect($order->ready_for_release_at)->not->toBeNull();

    expect(
        Notification::query()
            ->where('user_id', $studentUser->id)
            ->where('type', Notification::TYPE_ORDER_READY_FOR_PICKUP)
            ->count(),
    )->toBe(1);

    /*
    |--------------------------------------------------------------------------
    | Step 9: Specialist Releases The Merchandise
    |--------------------------------------------------------------------------
    */

    $this->actingAs($specialist)
        ->patch("/specialist/orders/{$order->id}/release")
        ->assertSessionDoesntHaveErrors();

    $order->refresh();
    expect($order->fulfillment_status)->toBe(Order::FULFILLMENT_RELEASED);
    expect($order->released_at)->not->toBeNull();

    $inventory->refresh();
    expect((int) $inventory->quantity_on_hand)->toBe(8); // 10 - 2
    expect((int) $inventory->quantity_reserved)->toBe(0); // released back down

    expect(
        StockMovement::query()
            ->where('product_variant_id', $variant->id)
            ->where('movement_type', StockMovement::TYPE_RELEASE)
            ->count(),
    )->toBe(1);

    expect(
        Notification::query()
            ->where('user_id', $studentUser->id)
            ->where('type', Notification::TYPE_ORDER_RELEASED)
            ->count(),
    )->toBe(1);

    /*
    |--------------------------------------------------------------------------
    | Step 10: The Finished Transaction Is Visible Everywhere It Should Be
    |--------------------------------------------------------------------------
    */

    // Payment History (cashier) — the completed transaction shows up,
    // with its items and full fulfillment timeline.
    $this->actingAs($cashier)
        ->get('/cashier/payments')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('cashier/Payments/Index')
            ->where('payments.data.0.id', $order->id)
            ->where('payments.data.0.transaction_number', $order->transaction_number)
            ->where('payments.data.0.fulfillment_status', Order::FULFILLMENT_RELEASED)
            ->where('payments.data.0.items.0.product_name', $product->name)
            ->where('payments.data.0.items.0.quantity', 2),
        );

    // Sales report (cashier) — today's totals include this sale.
    $this->actingAs($cashier)
        ->get('/cashier/sales')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('cashier/Sales/Index')
            ->where('summary.today.total', '900.00')
            ->where('summary.today.transactions', 1),
        );

    // The student's own order page reflects the final state.
    $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('student/Orders/Show')
            ->where('order.payment_status', Order::PAYMENT_PAID)
            ->where('order.fulfillment_status', Order::FULFILLMENT_RELEASED),
        );

    // No pending-payment or waiting-for-payment queue references it anymore.
    $this->actingAs($cashier)
        ->get('/cashier/orders')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('cashier/Orders/Index')
            ->where('orders', []),
        );
});
