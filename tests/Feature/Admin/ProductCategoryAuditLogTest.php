<?php

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;

function catalogAuditTestAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function catalogAuditTestCategory(): Category
{
    return Category::query()->create([
        'name' => 'Test Category '.uniqid(),
        'is_active' => true,
    ]);
}

test('creating a product writes an audit log entry', function () {
    $admin = catalogAuditTestAdmin();
    $category = catalogAuditTestCategory();

    $this->actingAs($admin)->post('/admin/products', [
        'category_id' => $category->id,
        'name' => 'Test Hoodie',
        'base_price' => 500,
        'variant_mode' => Product::VARIANT_MODE_STANDARD,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'preorder_enabled' => false,
        'is_active' => true,
    ])->assertSessionDoesntHaveErrors();

    $product = Product::query()->latest('id')->first();

    $log = AuditLog::query()->where('module', 'products')->where('action', 'created')->latest('id')->first();

    expect($log)->not->toBeNull();
    expect($log->subject_id)->toBe($product->id);
    expect($log->new_values['name'])->toBe('Test Hoodie');
});

test('updating a product writes an audit log entry with before and after values', function () {
    $admin = catalogAuditTestAdmin();
    $category = catalogAuditTestCategory();

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRO-TEST01',
        'name' => 'Old Name',
        'base_price' => 100,
        'variant_mode' => Product::VARIANT_MODE_STANDARD,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'preorder_enabled' => false,
        'is_active' => true,
    ]);

    $this->actingAs($admin)->put("/admin/products/{$product->id}", [
        'category_id' => $category->id,
        'name' => 'New Name',
        'base_price' => 250,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'preorder_enabled' => false,
        'is_active' => true,
    ])->assertSessionDoesntHaveErrors();

    $log = AuditLog::query()->where('module', 'products')->where('action', 'updated')->latest('id')->first();

    expect($log)->not->toBeNull();
    expect($log->subject_id)->toBe($product->id);
    expect($log->old_values['name'])->toBe('Old Name');
    expect($log->new_values['name'])->toBe('New Name');
});

test('creating a category writes an audit log entry', function () {
    $admin = catalogAuditTestAdmin();

    $this->actingAs($admin)->post('/admin/categories', [
        'name' => 'New Category',
        'description' => 'A test category',
    ])->assertSessionHas('success');

    $category = Category::query()->latest('id')->first();

    $log = AuditLog::query()->where('module', 'categories')->where('action', 'created')->latest('id')->first();

    expect($log)->not->toBeNull();
    expect($log->subject_id)->toBe($category->id);
    expect($log->new_values['name'])->toBe('New Category');
});

test('updating a category writes an audit log entry with before and after values', function () {
    $admin = catalogAuditTestAdmin();
    $category = catalogAuditTestCategory();

    $this->actingAs($admin)->put("/admin/categories/{$category->id}", [
        'name' => 'Renamed Category',
        'description' => 'Updated description',
        'is_active' => true,
    ])->assertSessionHas('success');

    $log = AuditLog::query()->where('module', 'categories')->where('action', 'updated')->latest('id')->first();

    expect($log)->not->toBeNull();
    expect($log->subject_id)->toBe($category->id);
    expect($log->old_values['name'])->toBe($category->name);
    expect($log->new_values['name'])->toBe('Renamed Category');
});

test('a variant-level products log does not get treated as a product-level record', function () {
    $admin = catalogAuditTestAdmin();
    $category = catalogAuditTestCategory();

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRO-TEST02',
        'name' => 'Variant Test Product',
        'base_price' => 100,
        'variant_mode' => Product::VARIANT_MODE_STANDARD,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'preorder_enabled' => false,
        'is_active' => true,
    ]);

    // A variant's subject_id is a ProductVariant ID, which may
    // coincidentally collide with a real Product ID — the fix must
    // key off the action, not just the module, to tell them apart.
    $log = AuditLog::create([
        'user_id' => $admin->id,
        'actor_name' => $admin->name,
        'actor_email' => $admin->email,
        'actor_role' => $admin->role,
        'action' => 'variant_created',
        'module' => 'products',
        'description' => 'Test variant creation',
        'subject_id' => $product->id,
    ]);

    $response = $this->actingAs($admin)->get('/admin/audit-logs');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/AuditLogs/Index')
        ->where('logs.data.0.related_record_url', null)
        ->where('logs.data.0.subject_summary', null),
    );
});
