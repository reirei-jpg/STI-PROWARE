<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create persistent carts for students and
     * specialist-assisted transactions.
     */
    public function up(): void
    {
        Schema::create(
            'carts',
            function (Blueprint $table): void {
                $table->id();

                /*
                 * The student who will receive the order.
                 *
                 * For self-service:
                 * student_id belongs to the logged-in student.
                 *
                 * For assisted ordering:
                 * student_id belongs to the student selected
                 * by the specialist.
                 */
                $table->foreignId(
                    'student_id',
                )
                    ->constrained()
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                /*
                 * The user who created or currently manages
                 * this cart.
                 *
                 * This may be the student or a specialist.
                 */
                $table->foreignId(
                    'created_by',
                )
                    ->constrained('users')
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                /*
                 * Identifies how the cart was created.
                 *
                 * student_app
                 * specialist_assisted
                 */
                $table->string(
                    'source',
                    40,
                );

                /*
                 * Cart lifecycle:
                 *
                 * active
                 * checked_out
                 * abandoned
                 */
                $table->string(
                    'status',
                    30,
                )
                    ->default('active');

                $table->timestamps();

                /*
                 * Helps quickly locate the active cart being
                 * managed by a particular user.
                 */
                $table->index(
                    [
                        'created_by',
                        'status',
                    ],
                    'carts_creator_status_index',
                );

                /*
                 * Helps retrieve a student's active or
                 * previous carts.
                 */
                $table->index(
                    [
                        'student_id',
                        'status',
                    ],
                    'carts_student_status_index',
                );
            },
        );
    }

    /**
     * Remove the carts table.
     */
    public function down(): void
    {
        Schema::dropIfExists(
            'carts',
        );
    }
};
