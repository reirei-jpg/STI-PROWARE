<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'orders',
            function (Blueprint $table): void {
                $table->id();

                /*
                 * Human-readable PROWARE order number.
                 *
                 * Example:
                 * ORD-20260808-000001
                 */
                $table->string(
                    'order_number',
                    40,
                )->unique();

                /*
                 * Student who owns / receives the order.
                 */
                $table->foreignId(
                    'student_id',
                )
                    ->constrained()
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                /*
                 * User who created the order.
                 *
                 * Student self-service:
                 * created_by = student's user ID
                 *
                 * Specialist-assisted:
                 * created_by = specialist's user ID
                 */
                $table->foreignId(
                    'created_by',
                )
                    ->constrained('users')
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                /*
                 * Where the order came from.
                 *
                 * student_app
                 * specialist_assisted
                 */
                $table->string(
                    'source',
                    40,
                );

                /*
                 * Whether the order contains regular
                 * merchandise or preorder merchandise.
                 *
                 * order
                 * preorder
                 * mixed
                 */
                $table->string(
                    'order_type',
                    30,
                );

                /*
                 * Payment lifecycle.
                 *
                 * pending
                 * paid
                 * cancelled
                 */
                $table->string(
                    'payment_status',
                    30,
                )->default('pending');

                /*
                 * Fulfillment lifecycle.
                 *
                 * pending
                 * preparing
                 * ready_for_release
                 * released
                 * cancelled
                 */
                $table->string(
                    'fulfillment_status',
                    40,
                )->default('pending');

                /*
                 * Money snapshot at checkout.
                 */
                $table->decimal(
                    'subtotal',
                    12,
                    2,
                );

                $table->decimal(
                    'total',
                    12,
                    2,
                );

                /*
                 * Unique value encoded inside the QR code.
                 *
                 * Do not encode a predictable database ID
                 * directly into the QR.
                 */
                $table->string(
                    'qr_token',
                    100,
                )->unique();

                /*
                 * Useful business timestamps.
                 */
                $table->timestamp(
                    'paid_at',
                )->nullable();

                $table->timestamp(
                    'ready_for_release_at',
                )->nullable();

                $table->timestamp(
                    'released_at',
                )->nullable();

                $table->timestamp(
                    'cancelled_at',
                )->nullable();

                $table->timestamps();

                $table->index(
                    [
                        'student_id',
                        'payment_status',
                    ],
                    'orders_student_payment_index',
                );

                $table->index(
                    [
                        'student_id',
                        'fulfillment_status',
                    ],
                    'orders_student_fulfillment_index',
                );

                $table->index(
                    [
                        'created_by',
                        'source',
                    ],
                    'orders_creator_source_index',
                );
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'orders',
        );
    }
};
