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
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('cancelled_by')
                ->nullable()
                ->after('cancelled_at')
                ->constrained('users')
                ->nullOnDelete();

            $table->string('cancellation_reason', 50)
                ->nullable()
                ->after('cancelled_by');

            $table->text('cancellation_note')
                ->nullable()
                ->after('cancellation_reason');

            $table->timestamp('refund_confirmed_at')
                ->nullable()
                ->after('cancellation_note');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cancelled_by');

            $table->dropColumn([
                'cancellation_reason',
                'cancellation_note',
                'refund_confirmed_at',
            ]);
        });
    }
};
