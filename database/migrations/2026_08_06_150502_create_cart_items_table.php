<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Store the exact product variants selected
     * inside each active cart.
     */
    public function up(): void
    {
        Schema::create(
            'cart_items',
            function (Blueprint $table): void {
                $table->id();

                $table->foreignId(
                    'cart_id',
                )
                    ->constrained()
                    ->cascadeOnUpdate()
                    ->cascadeOnDelete();

                $table->foreignId(
                    'product_variant_id',
                )
                    ->constrained()
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                /*
                 * Normal order item or preorder item.
                 *
                 * order
                 * preorder
                 */
                $table->string(
                    'item_type',
                    30,
                )
                    ->default('order');

                $table->unsignedInteger(
                    'quantity',
                );

                /*
                 * Store the price when the item is added.
                 *
                 * This protects the cart from later product
                 * price changes before checkout.
                 */
                $table->decimal(
                    'unit_price',
                    12,
                    2,
                );

                $table->timestamps();

                /*
                 * Prevent the same exact variant and item type
                 * from appearing twice in one cart.
                 *
                 * Adding it again should increase quantity
                 * instead of creating a duplicate row.
                 */
                $table->unique(
                    [
                        'cart_id',
                        'product_variant_id',
                        'item_type',
                    ],
                    'cart_items_cart_variant_type_unique',
                );

                $table->index(
                    [
                        'product_variant_id',
                        'item_type',
                    ],
                    'cart_items_variant_type_index',
                );
            },
        );
    }

    /**
     * Remove the cart items table.
     */
    public function down(): void
    {
        Schema::dropIfExists(
            'cart_items',
        );
    }
};
