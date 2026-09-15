<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create(
            'positions',
            function (Blueprint $table): void {
                $table->id();

                $table->string('name');

                /*
                 * Position must belong to an existing
                 * PROWARE staff authorization role.
                 *
                 * Example:
                 * cashier position -> role = cashier
                 * specialist position -> role = specialist
                 */
                $table->string('role');

                /*
                 * Lower number = higher organizational rank.
                 *
                 * Example:
                 * 1 = Lead / Supervisor
                 * 2 = Senior
                 * 3 = Regular
                 * 4 = Trainee
                 */
                $table
                    ->unsignedInteger('level');

                /*
                 * Indicates whether employees holding
                 * this position may act as supervisors.
                 */
                $table
                    ->boolean('is_supervisory')
                    ->default(false);

                /*
                 * Allows a position to be retired from
                 * future assignment without deleting it.
                 */
                $table
                    ->boolean('is_active')
                    ->default(true);

                $table->timestamps();

                /*
                 * Prevent duplicate position names
                 * inside the same system role.
                 */
                $table->unique([
                    'role',
                    'name',
                ]);
            },
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists(
            'positions',
        );
    }
};
