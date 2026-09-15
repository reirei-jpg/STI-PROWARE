<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the history table for inventory changes.
     */
    public function up(): void
    {
        Schema::create(
            'stock_movements',
            function (Blueprint $table): void {
                $table->id();

                /*
                 * The inventory record whose quantity changed.
                 */
                $table->foreignId('inventory_id')
                    ->constrained('inventories')
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                /*
                 * The product variant affected by the movement.
                 *
                 * Although inventory already belongs to a variant,
                 * storing this directly makes reporting and searching
                 * stock history easier.
                 */
                $table->foreignId('product_variant_id')
                    ->constrained('product_variants')
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                /*
                 * The user who performed the stock transaction.
                 */
                $table->foreignId('performed_by')
                    ->constrained('users')
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                /*
                 * Type of inventory movement.
                 *
                 * Examples:
                 * receive
                 * sale
                 * adjustment
                 * return
                 * reservation
                 * release
                 */
                $table->string(
                    'movement_type',
                    30,
                );

                /*
                 * Positive for stock entering inventory.
                 * Negative for stock leaving inventory.
                 *
                 * Receiving 10 units:
                 * quantity_change = 10
                 *
                 * Selling 3 units:
                 * quantity_change = -3
                 */
                $table->integer('quantity_change');

                /*
                 * Quantity before and after the movement.
                 *
                 * These columns make audits easier because we do
                 * not need to reconstruct every previous movement.
                 */
                $table->unsignedInteger(
                    'quantity_before',
                );

                $table->unsignedInteger(
                    'quantity_after',
                );

                /*
                 * Optional supplier reference, delivery receipt,
                 * official receipt, purchase order, or other code.
                 */
                $table->string(
                    'reference_number',
                    100,
                )->nullable();

                /*
                 * Optional explanation about the transaction.
                 */
                $table->text('notes')
                    ->nullable();

                $table->timestamps();

                /*
                 * Improve searches used by stock-history pages
                 * and future reports.
                 */
                $table->index(
                    [
                        'product_variant_id',
                        'movement_type',
                    ],
                    'stock_movements_variant_type_index',
                );

                $table->index(
                    [
                        'performed_by',
                        'created_at',
                    ],
                    'stock_movements_user_date_index',
                );
            },
        );
    }

    /**
     * Remove the stock movement table.
     */
    public function down(): void
    {
        Schema::dropIfExists(
            'stock_movements',
        );
    }
};
