<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        private readonly OrderNumberGenerator $orderNumberGenerator,
    ) {}

    /**
     * Checkout the logged-in student's active cart.
     */
    public function checkoutForStudent(
        User $user,
        array $itemIds,
    ): Order {
        if ($user->role !== 'student') {
            throw ValidationException::withMessages([
                'checkout' => 'Only a student account may use student checkout.',
            ]);
        }

        $student =
            $user->student;

        if (! $student) {
            throw ValidationException::withMessages([
                'student' => 'This account does not have a student profile.',
            ]);
        }

        return DB::transaction(
            function () use (
                $user,
                $student,
                $itemIds,
            ): Order {
                /*
                 * Lock the active cart so it cannot be checked
                 * out twice at the same time.
                 */
                $cart = Cart::query()
                    ->where(
                        'student_id',
                        $student->id,
                    )
                    ->where(
                        'created_by',
                        $user->id,
                    )
                    ->where(
                        'source',
                        Cart::SOURCE_STUDENT_APP,
                    )
                    ->where(
                        'status',
                        Cart::STATUS_ACTIVE,
                    )
                    ->lockForUpdate()
                    ->first();

                if (! $cart) {
                    throw ValidationException::withMessages([
                        'cart' => 'You do not have an active shopping cart.',
                    ]);
                }

                /*
                 * Lock cart items as well.
                 */
                $selectedItemIds =
                            collect($itemIds)
                                ->map(
                                    fn ($id): int => (int) $id,
                                )
                                ->unique()
                                ->values();

                if ($selectedItemIds->isEmpty()) {
                    throw ValidationException::withMessages([
                        'cart' => 'Please select at least one cart item.',
                    ]);
                }

                $cartItems =
                    CartItem::query()
                        ->where(
                            'cart_id',
                            $cart->id,
                        )
                        ->whereIn(
                            'id',
                            $selectedItemIds,
                        )
                        ->lockForUpdate()
                        ->get();

                if (
                    $cartItems->count()
                    !== $selectedItemIds->count()
                ) {
                    throw ValidationException::withMessages([
                        'cart' => 'One or more selected cart items are no longer available.',
                    ]);
                }

                $validatedItems = [];

                $subtotal = 0.0;

                $hasOrderItems = false;
                $hasPreorderItems = false;
                $earlyBirdUnitsAllocatedThisCheckout = [];

                foreach ($cartItems as $cartItem) {
                    $variant =
                        ProductVariant::query()
                            ->with('product')
                            ->lockForUpdate()
                            ->find(
                                $cartItem
                                    ->product_variant_id,
                            );

                    if (! $variant) {
                        throw ValidationException::withMessages([
                            'cart' => 'One of the selected product variants no longer exists.',
                        ]);
                    }

                    $product =
                        Product::query()
                            ->lockForUpdate()
                            ->find(
                                $variant->product_id,
                            );

                    if (! $product) {
                        throw ValidationException::withMessages([
                            'cart' => 'One of the products in your cart no longer exists.',
                        ]);
                    }

                    if (! $product->isCatalogVisible()) {
                        throw ValidationException::withMessages([
                            'cart' => "{$product->name} is no longer available in the merchandise catalog.",
                        ]);
                    }

                    if (! $variant->is_active) {
                        throw ValidationException::withMessages([
                            'cart' => "{$variant->variant_name} is no longer active.",
                        ]);
                    }

                    if ($cartItem->quantity < 1) {
                        throw ValidationException::withMessages([
                            'cart' => "The quantity for {$product->name} is invalid.",
                        ]);
                    }

                    /*
                     * Recalculate the trusted current selling price.
                     * Never trust the browser or stale cart price.
                     */
                    $unitPrice =
                        (float) $variant
                            ->selling_price;

                    $lineTotal =
                        $unitPrice
                        * $cartItem->quantity;

                    /*
                     * Normal stocked item.
                     */
                    if (
                        $cartItem->item_type
                        === CartItem::TYPE_ORDER
                    ) {
                        $hasOrderItems = true;

                        /*
                         * The product must still be available as
                         * a normal merchandise product.
                         */
                        if (! $product->isAvailable()) {
                            throw ValidationException::withMessages([
                                'cart' => "{$product->name} is no longer available for normal ordering.",
                            ]);
                        }

                        $inventory =
                            Inventory::query()
                                ->where(
                                    'product_variant_id',
                                    $variant->id,
                                )
                                ->lockForUpdate()
                                ->first();

                        if (! $inventory) {
                            throw ValidationException::withMessages([
                                'cart' => "Inventory could not be found for {$variant->variant_name}.",
                            ]);
                        }

                        $availableQuantity =
                            $inventory
                                ->available_quantity;

                        if (
                            $cartItem->quantity
                            > $availableQuantity
                        ) {
                            throw ValidationException::withMessages([
                                'cart' => "{$variant->variant_name} only has {$availableQuantity} unit(s) available. "
                                    ."Your cart currently requests {$cartItem->quantity} unit(s). "
                                    .'Please update your cart before checking out.',
                            ]);
                        }

                        $validatedItems[] = [
                            'cart_item' => $cartItem,

                            'variant' => $variant,

                            'product' => $product,

                            'inventory' => $inventory,

                            'unit_price' => $unitPrice,

                            'line_total' => $lineTotal,
                        ];
                    } elseif (
                        $cartItem->item_type
                        === CartItem::TYPE_PREORDER
                    ) {
                        $hasPreorderItems = true;
                        /*
                        * Early-bird preorder pricing.
                        *
                        * Early-bird slots are counted by preorder
                        * quantity already submitted for this product.
                        *
                        * The whole cart line receives the discount only
                        * when its full quantity fits in the remaining slots.
                        */
                        $originalUnitPrice =
                            $unitPrice;

                        $discountPercent = 0.0;
                        $discountAmount = 0.0;
                        $earlyBirdApplied = false;

                        $earlyBirdSlots =
                            max(
                                0,
                                (int)
                                ($product->preorder_early_bird_slots ?? 0),
                            );

                        $earlyBirdDiscountPercent =
                            max(
                                0,
                                (float)
                                ($product->preorder_early_bird_discount_percent ?? 0),
                            );

                        if (
                            $earlyBirdSlots > 0
                            && $earlyBirdDiscountPercent > 0
                        ) {
                            $usedEarlyBirdSlots =
                                OrderItem::query()
                                    ->where(
                                        'item_type',
                                        OrderItem::TYPE_PREORDER,
                                    )
                                    ->whereHas(
                                        'productVariant',
                                        function ($query) use ($product): void {
                                            $query->where(
                                                'product_id',
                                                $product->id,
                                            );
                                        },
                                    )
                                    ->where(
                                        'early_bird_applied',
                                        true,
                                    )
                                    ->sum('quantity');

                            $currentCheckoutAllocated =
                                $earlyBirdUnitsAllocatedThisCheckout[
                                    $product->id
                                ] ?? 0;

                            $remainingEarlyBirdSlots =
                                max(
                                    0,
                                    $earlyBirdSlots
                                        - (int) $usedEarlyBirdSlots
                                        - $currentCheckoutAllocated,
                                );

                            if (
                                $cartItem->quantity
                                <= $remainingEarlyBirdSlots
                            ) {
                                $earlyBirdApplied = true;

                                $earlyBirdUnitsAllocatedThisCheckout[
                                        $product->id
                                    ] =
                                        $currentCheckoutAllocated
                                        + $cartItem->quantity;

                                $discountPercent =
                                    $earlyBirdDiscountPercent;

                                $discountAmount =
                                    round(
                                        $originalUnitPrice
                                        * ($discountPercent / 100),
                                        2,
                                    );

                                $unitPrice =
                                    max(
                                        0,
                                        $originalUnitPrice
                                            - $discountAmount,
                                    );

                                $lineTotal =
                                    $unitPrice
                                    * $cartItem->quantity;
                            }
                        }

                        if (
                            ! $product->isComingSoon()
                            || ! $product->acceptsPreorders()
                        ) {
                            throw ValidationException::withMessages([
                                'cart' => "Preorders are no longer available for {$product->name}.",
                            ]);
                        }

                        $limit =
                            $product
                                ->preorder_limit_per_student;

                        if (
                            $limit !== null
                            && $cartItem->quantity
                                > $limit
                        ) {
                            throw ValidationException::withMessages([
                                'cart' => "{$product->name} allows a maximum preorder quantity of {$limit} unit(s) per student.",
                            ]);
                        }

                        $validatedItems[] = [
                            'cart_item' => $cartItem,

                            'variant' => $variant,

                            'product' => $product,

                            'inventory' => null,

                            'original_unit_price' => $originalUnitPrice,

                            'discount_percent' => $discountPercent,

                            'discount_amount' => $discountAmount,

                            'early_bird_applied' => $earlyBirdApplied,

                            'unit_price' => $unitPrice,

                            'line_total' => $lineTotal,
                        ];
                    } else {
                        throw ValidationException::withMessages([
                            'cart' => 'One of the items in your cart has an invalid order type.',
                        ]);
                    }

                    $subtotal +=
                        $lineTotal;
                }

                /*
                 * Determine the final order type.
                 */
                $orderType =
                    match (true) {
                        $hasOrderItems
                            && $hasPreorderItems => Order::TYPE_MIXED,

                        $hasPreorderItems => Order::TYPE_PREORDER,

                        default => Order::TYPE_ORDER,
                    };

                /*
                 * No additional charges yet, so total equals
                 * subtotal.
                 */
                $total =
                    $subtotal;

                /*
                 * The listed price already includes VAT.
                 *
                 * This does not add anything to $total. It only
                 * records how much of that same total is tax,
                 * so the receipt can disclose the breakdown.
                 */
                $taxAmount =
                    round(
                        $total
                        * (
                            Order::TAX_RATE
                            / (1 + Order::TAX_RATE)
                        ),
                        2,
                    );

                $order = Order::create([
                    'order_number' => $this
                        ->orderNumberGenerator
                        ->generate(),

                    'student_id' => $student->id,

                    'created_by' => $user->id,

                    'source' => Order::SOURCE_STUDENT_APP,

                    'order_type' => $orderType,

                    'payment_status' => Order::PAYMENT_PENDING,

                    'fulfillment_status' => Order::FULFILLMENT_PENDING,

                    'subtotal' => number_format(
                        $subtotal,
                        2,
                        '.',
                        '',
                    ),

                    'total' => number_format(
                        $total,
                        2,
                        '.',
                        '',
                    ),

                    'tax_rate' => Order::TAX_RATE * 100,

                    'tax_amount' => number_format(
                        $taxAmount,
                        2,
                        '.',
                        '',
                    ),

                    /*
                     * Random token used later for the QR code.
                     */
                    'qr_token' => Str::random(64),
                ]);

                foreach (
                    $validatedItems as $validatedItem
                ) {
                    /** @var CartItem $cartItem */
                    $cartItem =
                        $validatedItem[
                            'cart_item'
                        ];

                    /** @var ProductVariant $variant */
                    $variant =
                        $validatedItem[
                            'variant'
                        ];

                    $product =
                        $validatedItem[
                            'product'
                        ];

                    /** @var Inventory|null $inventory */
                    $inventory =
                        $validatedItem[
                            'inventory'
                        ];

                    $unitPrice =
                        $validatedItem[
                            'unit_price'
                        ];

                    $lineTotal =
                        $validatedItem[
                            'line_total'
                        ];

                    OrderItem::create([
                        'order_id' => $order->id,

                        'product_variant_id' => $variant->id,

                        'product_code' => $product->code,

                        'product_name' => $product->name,

                        'variant_name' => $variant
                            ->variant_name,

                        'sku' => $variant->sku,

                        'program' => $variant->program,

                        'size' => $variant->size,

                        'item_type' => $cartItem->item_type,

                        'preorder_status' => $cartItem->item_type
                                === CartItem::TYPE_PREORDER
                                    ? OrderItem::PREORDER_STATUS_WAITING
                                    : null,

                        'quantity' => $cartItem->quantity,

                        'original_unit_price' => number_format(
                            $validatedItem[
                                'original_unit_price'
                            ] ?? $unitPrice,
                            2,
                            '.',
                            '',
                        ),

                        'discount_percent' => number_format(
                            $validatedItem[
                                'discount_percent'
                            ] ?? 0,
                            2,
                            '.',
                            '',
                        ),

                        'discount_amount' => number_format(
                            $validatedItem[
                                'discount_amount'
                            ] ?? 0,
                            2,
                            '.',
                            '',
                        ),

                        'early_bird_applied' => $validatedItem[
                                'early_bird_applied'
                            ] ?? false,

                        'unit_price' => number_format(
                            $unitPrice,
                            2,
                            '.',
                            '',
                        ),

                        /*
                         * Freeze the current weighted-average
                         * purchasing cost onto this line, so
                         * profit reporting stays accurate even
                         * if the average cost changes later.
                         *
                         * Preorder items have no inventory yet
                         * ($inventory is null), so their cost is
                         * unknown until they are actually stocked.
                         */
                        'unit_cost' => $inventory?->average_cost,

                        'line_total' => number_format(
                            $lineTotal,
                            2,
                            '.',
                            '',
                        ),
                    ]);

                    /*
                     * Reserve stock for normal-order items.
                     *
                     * IMPORTANT:
                     * We do NOT reduce quantity_on_hand yet.
                     *
                     * Example:
                     *
                     * quantity_on_hand = 20
                     * quantity_reserved = 0
                     *
                     * Student checks out 5
                     *
                     * quantity_on_hand = 20
                     * quantity_reserved = 5
                     * available_quantity = 15
                     *
                     * Physical stock is finalized later when
                     * the cashier releases the merchandise.
                     */
                    if (
                        $cartItem->item_type
                            === CartItem::TYPE_ORDER
                        && $inventory
                    ) {
                        $inventory->increment(
                            'quantity_reserved',
                            $cartItem->quantity,
                        );
                    }

                    /*
                     * Refresh the cart price snapshot so the
                     * checked-out cart also reflects the trusted
                     * checkout price.
                     */
                    $cartItem->update([
                        'unit_price' => number_format(
                            $unitPrice,
                            2,
                            '.',
                            '',
                        ),
                    ]);
                }

                /*
 * Remove only the cart items that were
 * successfully checked out.
 */
                CartItem::query()
                    ->where(
                        'cart_id',
                        $cart->id,
                    )
                    ->whereIn(
                        'id',
                        $selectedItemIds,
                    )
                    ->delete();

                /*
                * Keep the cart active when unselected
                * merchandise is still inside it.
                */
                $hasRemainingItems =
                    CartItem::query()
                        ->where(
                            'cart_id',
                            $cart->id,
                        )
                        ->exists();

                if (! $hasRemainingItems) {
                    $cart->update([
                        'status' => Cart::STATUS_CHECKED_OUT,
                    ]);
                }

                return $order->fresh([
                    'student.user',
                    'creator',
                    'items.productVariant.product',
                ]);
            },
            attempts: 3,
        );
    }
}
