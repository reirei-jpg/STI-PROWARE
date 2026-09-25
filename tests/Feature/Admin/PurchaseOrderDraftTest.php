<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Support\Str;

function draftAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function draftVariant(User $admin)
{
    $category = Category::query()->create([
        'name' => 'Category '.Str::random(8),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'Test Product',
        'base_price' => 500,
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

test('a brand-new draft can be saved with nothing filled in at all', function () {
    $admin = draftAdmin();

    $response = $this->actingAs($admin)->postJson('/admin/purchase-orders/draft', []);

    $response->assertOk();
    $response->assertJsonStructure(['po_number', 'id', 'edit_url']);

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    expect($purchaseOrder)->not->toBeNull()
        ->and($purchaseOrder->status)->toBe(PurchaseOrder::STATUS_DRAFT)
        ->and($purchaseOrder->supplier_name)->toBe('Untitled Draft')
        ->and($purchaseOrder->ordered_at)->toBeNull()
        ->and($purchaseOrder->items()->count())->toBe(0);
});

test('a draft can be saved with partial item data and quantities default to 0', function () {
    $admin = draftAdmin();

    $response = $this->actingAs($admin)->postJson('/admin/purchase-orders/draft', [
        'supplier_name' => 'Partial Supplier',
        'items' => [
            [
                'source_type' => 'new_inventory',
                'product_name' => 'Half-finished Item',
                // no quantity_ordered given at all
            ],
        ],
    ]);

    $response->assertOk();

    $item = PurchaseOrder::query()->latest('id')->first()->items()->first();

    expect($item->manual_name)->toBe('Half-finished Item')
        ->and($item->quantity_ordered)->toBe(0)
        ->and($item->item_type)->toBe(PurchaseOrderItem::TYPE_MANUAL);
});

test('a completely empty item row is silently skipped, not saved as a blank item', function () {
    $admin = draftAdmin();

    $response = $this->actingAs($admin)->postJson('/admin/purchase-orders/draft', [
        'supplier_name' => 'Supplier',
        'items' => [
            [
                'source_type' => 'new_inventory',
                // no name, no quantity, nothing identifying at all
            ],
        ],
    ]);

    $response->assertOk();

    expect(PurchaseOrder::query()->latest('id')->first()->items()->count())->toBe(0);
});

test('a draft with a past expected delivery date is still rejected', function () {
    $admin = draftAdmin();

    $response = $this->actingAs($admin)->postJson('/admin/purchase-orders/draft', [
        'expected_delivery_date' => now()->subDay()->toDateString(),
    ]);

    $response->assertStatus(422);

    expect(PurchaseOrder::query()->count())->toBe(0);
});

test('a non-admin cannot save a draft', function () {
    $specialist = User::factory()->create(['role' => 'specialist', 'is_active' => true]);

    $response = $this->actingAs($specialist)->postJson('/admin/purchase-orders/draft', [
        'supplier_name' => 'Nope',
    ]);

    $response->assertStatus(403);
});

test('the edit page loads a draft prefilled with its saved data', function () {
    $admin = draftAdmin();
    $variant = draftVariant($admin);

    $this->actingAs($admin)->postJson('/admin/purchase-orders/draft', [
        'supplier_name' => 'Resume Me',
        'items' => [
            [
                'source_type' => 'existing_catalog',
                'product_variant_id' => $variant->id,
                'quantity_ordered' => 4,
            ],
        ],
    ]);

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    $response = $this->actingAs($admin)->get("/admin/purchase-orders/{$purchaseOrder->id}/edit");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/PurchaseOrders/Create')
        ->where('purchaseOrder.supplier_name', 'Resume Me')
        ->where('purchaseOrder.items.0.product_variant_id', $variant->id)
        ->where('purchaseOrder.items.0.quantity_ordered', 4),
    );
});

test('the edit page refuses an already-ordered purchase order', function () {
    $admin = draftAdmin();
    $variant = draftVariant($admin);

    $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Real Order',
        'items' => [
            [
                'source_type' => 'existing_catalog',
                'product_variant_id' => $variant->id,
                'quantity_ordered' => 1,
            ],
        ],
    ]);

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    expect($purchaseOrder->status)->toBe(PurchaseOrder::STATUS_ORDERED);

    $this->actingAs($admin)->get("/admin/purchase-orders/{$purchaseOrder->id}/edit")
        ->assertNotFound();
});

test('saving progress on an existing draft replaces its items and keeps it a draft', function () {
    $admin = draftAdmin();
    $variant = draftVariant($admin);

    $this->actingAs($admin)->postJson('/admin/purchase-orders/draft', [
        'supplier_name' => 'First Pass',
        'items' => [
            ['source_type' => 'new_inventory', 'product_name' => 'Old Item', 'quantity_ordered' => 1],
        ],
    ]);

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    $response = $this->actingAs($admin)->patchJson("/admin/purchase-orders/{$purchaseOrder->id}/draft", [
        'supplier_name' => 'Second Pass',
        'items' => [
            [
                'source_type' => 'existing_catalog',
                'product_variant_id' => $variant->id,
                'quantity_ordered' => 7,
            ],
        ],
    ]);

    $response->assertOk();

    $purchaseOrder->refresh();

    expect($purchaseOrder->status)->toBe(PurchaseOrder::STATUS_DRAFT)
        ->and($purchaseOrder->supplier_name)->toBe('Second Pass')
        ->and($purchaseOrder->items()->count())->toBe(1)
        ->and($purchaseOrder->items()->first()->product_variant_id)->toBe($variant->id);
});

test('updateDraft refuses an already-ordered purchase order', function () {
    $admin = draftAdmin();
    $variant = draftVariant($admin);

    $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Real Order',
        'items' => [
            ['source_type' => 'existing_catalog', 'product_variant_id' => $variant->id, 'quantity_ordered' => 1],
        ],
    ]);

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    $this->actingAs($admin)->patchJson("/admin/purchase-orders/{$purchaseOrder->id}/draft", [
        'supplier_name' => 'Should not apply',
    ])->assertNotFound();
});

test('finalizing a draft with valid data turns it into a real ordered purchase order', function () {
    $admin = draftAdmin();
    $variant = draftVariant($admin);

    $this->actingAs($admin)->postJson('/admin/purchase-orders/draft', [
        'supplier_name' => 'Draft Supplier',
    ]);

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    $response = $this->actingAs($admin)->patch("/admin/purchase-orders/{$purchaseOrder->id}", [
        'supplier_name' => 'Final Supplier',
        'items' => [
            [
                'source_type' => 'existing_catalog',
                'product_variant_id' => $variant->id,
                'quantity_ordered' => 3,
                'unit_cost' => 50,
            ],
        ],
    ]);

    $response->assertRedirect(route('admin.purchase-orders.show', $purchaseOrder));

    $purchaseOrder->refresh();

    expect($purchaseOrder->status)->toBe(PurchaseOrder::STATUS_ORDERED)
        ->and($purchaseOrder->supplier_name)->toBe('Final Supplier')
        ->and($purchaseOrder->ordered_at)->not->toBeNull()
        ->and($purchaseOrder->items()->count())->toBe(1);
});

test('finalizing a draft still requires at least one valid item', function () {
    $admin = draftAdmin();

    $this->actingAs($admin)->postJson('/admin/purchase-orders/draft', [
        'supplier_name' => 'Draft Supplier',
    ]);

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    $this->actingAs($admin)->patch("/admin/purchase-orders/{$purchaseOrder->id}", [
        'supplier_name' => 'Final Supplier',
        'items' => [],
    ])->assertSessionHasErrors('items');

    expect($purchaseOrder->fresh()->status)->toBe(PurchaseOrder::STATUS_DRAFT);
});

test('a draft can be discarded through the existing archive endpoint', function () {
    $admin = draftAdmin();

    $this->actingAs($admin)->postJson('/admin/purchase-orders/draft', [
        'supplier_name' => 'Throwaway Draft',
    ]);

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    $this->actingAs($admin)->patch("/admin/purchase-orders/{$purchaseOrder->id}/archive")
        ->assertRedirect(route('admin.purchase-orders.index'));

    expect($purchaseOrder->fresh()->archived_at)->not->toBeNull();
});
