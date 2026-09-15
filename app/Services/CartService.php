<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartService
{
    /**
     * Add an exact product variant to a student's
     * self-service cart.
     */
    public function addForStudent(
        User $user,
        ProductVariant $variant,
        int $quantity,
    ): Cart {
        $student = $user->student;

        if (! $student) {
            throw ValidationException::withMessages([
                'student' => 'The logged-in account does not have a student profile.',
            ]);
        }

        return $this->addItem(
            student: $student,
            creator: $user,
            variant: $variant,
            quantity: $quantity,
            source: Cart::SOURCE_STUDENT_APP,
        );
    }

    /**
     * Add an exact product variant to a specialist-assisted
     * cart for a selected student.
     */
    public function addForSpecialist(
        User $specialist,
        Student $student,
        ProductVariant $variant,
        int $quantity,
    ): Cart {
        if ($specialist->role !== 'specialist') {
            throw ValidationException::withMessages([
                'user' => 'Only a PROWARE specialist may create an assisted cart.',
            ]);
        }

        return $this->addItem(
            student: $student,
            creator: $specialist,
            variant: $variant,
            quantity: $quantity,
            source: Cart::SOURCE_SPECIALIST_ASSISTED,
        );
    }

    /**
     * Add or increase a cart item inside one transaction.
     */
    private function addItem(
        Student $student,
        User $creator,
        ProductVariant $variant,
        int $quantity,
        string $source,
    ): Cart {
        if ($quantity < 1) {
            throw ValidationException::withMessages([
                'quantity' => 'The quantity must be at least 1.',
            ]);
        }

        return DB::transaction(
            function () use (
                $student,
                $creator,
                $variant,
                $quantity,
                $source,
            ): Cart {
                $variant = ProductVariant::query()
                    ->with([
                        'product',
                        'inventory',
                    ])
                    ->lockForUpdate()
                    ->findOrFail(
                        $variant->id,
                    );

                $product =
                    $variant->product;

                $this->validateProduct(
                    product: $product,
                    variant: $variant,
                );

                $itemType =
                    $this->determineItemType(
                        $product,
                    );

                $cart =
                    $this->findOrCreateActiveCart(
                        student: $student,
                        creator: $creator,
                        source: $source,
                    );

                $existingItem = CartItem::query()
                    ->where(
                        'cart_id',
                        $cart->id,
                    )
                    ->where(
                        'product_variant_id',
                        $variant->id,
                    )
                    ->where(
                        'item_type',
                        $itemType,
                    )
                    ->lockForUpdate()
                    ->first();

                $currentCartQuantity =
                    $existingItem
                        ? $existingItem->quantity
                        : 0;

                $newQuantity =
                    $currentCartQuantity
                    + $quantity;

                $this->validateQuantityForType(
                    product: $product,
                    variant: $variant,
                    itemType: $itemType,
                    requestedTotalQuantity: $newQuantity,
                    currentCartQuantity: $currentCartQuantity,
                );

                if ($existingItem) {
                    $existingItem->update([
                        'quantity' => $newQuantity,

                        /*
                         * Refresh the trusted price snapshot
                         * whenever the same variant is added again.
                         */
                        'unit_price' => $variant->selling_price,
                    ]);
                } else {
                    CartItem::create([
                        'cart_id' => $cart->id,

                        'product_variant_id' => $variant->id,

                        'item_type' => $itemType,

                        'quantity' => $quantity,

                        'unit_price' => $variant->selling_price,
                    ]);
                }

                return $cart->fresh([
                    'items.productVariant.product',
                ]);
            },
            attempts: 3,
        );
    }

    /**
     * Find the active cart managed by this user for this
     * student and source, or create one.
     */
    private function findOrCreateActiveCart(
        Student $student,
        User $creator,
        string $source,
    ): Cart {
        $cart = Cart::query()
            ->where(
                'student_id',
                $student->id,
            )
            ->where(
                'created_by',
                $creator->id,
            )
            ->where(
                'source',
                $source,
            )
            ->where(
                'status',
                Cart::STATUS_ACTIVE,
            )
            ->lockForUpdate()
            ->first();

        if ($cart) {
            return $cart;
        }

        return Cart::create([
            'student_id' => $student->id,

            'created_by' => $creator->id,

            'source' => $source,

            'status' => Cart::STATUS_ACTIVE,
        ]);
    }

    /**
     * Validate product and variant eligibility.
     */
    private function validateProduct(
        Product $product,
        ProductVariant $variant,
    ): void {
        if (! $product->isCatalogVisible()) {
            throw ValidationException::withMessages([
                'product' => 'This product is not available in the merchandise catalog.',
            ]);
        }

        if (! $variant->is_active) {
            throw ValidationException::withMessages([
                'variant' => 'The selected product variant is inactive.',
            ]);
        }

        if (
            $variant->product_id
            !== $product->id
        ) {
            throw ValidationException::withMessages([
                'variant' => 'The selected variant does not belong to this product.',
            ]);
        }
    }

    /**
     * Determine whether the selected product should be
     * stored as a normal order item or preorder item.
     */
    private function determineItemType(
        Product $product,
    ): string {
        if (
            $product->isComingSoon()
            && $product->acceptsPreorders()
        ) {
            return CartItem::TYPE_PREORDER;
        }

        if ($product->isAvailable()) {
            return CartItem::TYPE_ORDER;
        }

        if ($product->isComingSoon()) {
            throw ValidationException::withMessages([
                'product' => 'Preorders are not currently open for this product.',
            ]);
        }

        if ($product->isOutOfStock()) {
            throw ValidationException::withMessages([
                'product' => 'This product is currently out of stock.',
            ]);
        }

        throw ValidationException::withMessages([
            'product' => 'This product cannot currently be added to a cart.',
        ]);
    }

    /**
     * Apply stock or preorder quantity rules.
     */
    private function validateQuantityForType(
        Product $product,
        ProductVariant $variant,
        string $itemType,
        int $requestedTotalQuantity,
        int $currentCartQuantity,
    ): void {
        if (
            $itemType
            === CartItem::TYPE_ORDER
        ) {
            $inventory =
                $variant->inventory;

            $availableQuantity =
                $inventory
                    ? $inventory
                        ->available_quantity
                    : 0;

            if (
                $requestedTotalQuantity
                > $availableQuantity
            ) {
                $remainingAllowed = max(
                    0,
                    $availableQuantity
                    - $currentCartQuantity,
                );

                throw ValidationException::withMessages([
                    'quantity' => "You already have {$currentCartQuantity} unit(s) of {$variant->variant_name} in your cart. "
                        ."There are {$availableQuantity} unit(s) available in total. "
                        ."You may add up to {$remainingAllowed} more unit(s).",
                ]);
            }

            return;
        }

        $limit =
            $product
                ->preorder_limit_per_student;

        if (
            $limit !== null
            && $requestedTotalQuantity > $limit
        ) {
            $remainingAllowed = max(
                0,
                $limit
                - $currentCartQuantity,
            );

            throw ValidationException::withMessages([
                'quantity' => "You already have {$currentCartQuantity} preorder unit(s) of {$variant->variant_name} in your cart. "
                    ."This product allows a maximum of {$limit} unit(s) per student. "
                    ."You may add up to {$remainingAllowed} more unit(s).",
            ]);
        }

        /*
         * Total preorder capacity will be enforced during
         * checkout when permanent preorder records exist.
         */
    }
}
