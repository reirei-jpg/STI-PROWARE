<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'purchase_orders',
            function (
                Blueprint $table,
            ): void {
                $table->id();

                /*
                 * Internal PROWARE PO number.
                 *
                 * Example:
                 * PO-20260815-000001
                 */
                $table
                    ->string(
                        'po_number',
                        40,
                    )
                    ->unique();

                /*
                 * Supplier name.
                 *
                 * We are keeping supplier
                 * management simple for now.
                 * Later we can create a
                 * suppliers table if needed.
                 */
                $table
                    ->string(
                        'supplier_name',
                        150,
                    );

                /*
                 * Reference provided by
                 * the supplier, if any.
                 */
                $table
                    ->string(
                        'supplier_reference_number',
                        100,
                    )
                    ->nullable();

                /*
                 * Date Admin expects
                 * the merchandise to arrive.
                 */
                $table
                    ->date(
                        'expected_delivery_date',
                    )
                    ->nullable();

                /*
                 * Purchase order lifecycle:
                 *
                 * draft
                 * ordered
                 * partially_received
                 * completed
                 * cancelled
                 */
                $table
                    ->string(
                        'status',
                        30,
                    )
                    ->default(
                        'draft',
                    );

                /*
                 * Admin who created the PO.
                 */
                $table
                    ->foreignId(
                        'created_by',
                    )
                    ->constrained(
                        'users',
                    )
                    ->restrictOnDelete();

                /*
                 * When Admin officially
                 * marks this PO as ordered.
                 */
                $table
                    ->timestamp(
                        'ordered_at',
                    )
                    ->nullable();

                /*
                 * When all expected stock
                 * has been received.
                 */
                $table
                    ->timestamp(
                        'completed_at',
                    )
                    ->nullable();

                /*
                 * Optional Admin notes.
                 */
                $table
                    ->text(
                        'notes',
                    )
                    ->nullable();

                $table->timestamps();

                /*
                 * Useful indexes.
                 */
                $table->index(
                    'status',
                );

                $table->index(
                    'expected_delivery_date',
                );
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'purchase_orders',
        );
    }
};
