<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add catalog availability and preorder configuration.
     */
    public function up(): void
    {
        Schema::table(
            'products',
            function (Blueprint $table): void {
                /*
                 * Controls how the product appears in the catalog.
                 *
                 * Values:
                 * available
                 * coming_soon
                 * out_of_stock
                 * inactive
                 */
                $table->string(
                    'availability_status',
                    30,
                )
                    ->default('available')
                    ->after('variant_mode');

                /*
                 * Determines whether Coming Soon products may
                 * accept preorder requests.
                 */
                $table->boolean(
                    'preorder_enabled',
                )
                    ->default(false)
                    ->after('availability_status');

                /*
                 * Expected public release date.
                 */
                $table->date(
                    'expected_release_date',
                )
                    ->nullable()
                    ->after('preorder_enabled');

                /*
                 * Optional preorder opening and closing schedule.
                 */
                $table->dateTime(
                    'preorder_starts_at',
                )
                    ->nullable()
                    ->after('expected_release_date');

                $table->dateTime(
                    'preorder_ends_at',
                )
                    ->nullable()
                    ->after('preorder_starts_at');

                /*
                 * Maximum quantity one student may preorder
                 * for this product.
                 */
                $table->unsignedInteger(
                    'preorder_limit_per_student',
                )
                    ->nullable()
                    ->after('preorder_ends_at');

                /*
                 * Maximum total preorder quantity accepted
                 * across all students.
                 */
                $table->unsignedInteger(
                    'preorder_capacity',
                )
                    ->nullable()
                    ->after('preorder_limit_per_student');

                /*
                 * Improve catalog filtering and preorder queries.
                 */
                $table->index(
                    [
                        'availability_status',
                        'is_active',
                    ],
                    'products_catalog_status_active_index',
                );

                $table->index(
                    [
                        'preorder_enabled',
                        'preorder_starts_at',
                        'preorder_ends_at',
                    ],
                    'products_preorder_window_index',
                );
            },
        );
    }

    /**
     * Remove catalog and preorder configuration.
     */
    public function down(): void
    {
        Schema::table(
            'products',
            function (Blueprint $table): void {
                $table->dropIndex(
                    'products_catalog_status_active_index',
                );

                $table->dropIndex(
                    'products_preorder_window_index',
                );

                $table->dropColumn([
                    'availability_status',
                    'preorder_enabled',
                    'expected_release_date',
                    'preorder_starts_at',
                    'preorder_ends_at',
                    'preorder_limit_per_student',
                    'preorder_capacity',
                ]);
            },
        );
    }
};
