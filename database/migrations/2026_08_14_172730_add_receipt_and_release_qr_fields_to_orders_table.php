<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table
                ->string('transaction_number')
                ->nullable()
                ->unique();

            $table
                ->string('release_qr_token', 100)
                ->nullable()
                ->unique();

            $table
                ->timestamp('payment_qr_used_at')
                ->nullable();

            $table
                ->timestamp('release_qr_used_at')
                ->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'transaction_number',
                'release_qr_token',
                'payment_qr_used_at',
                'release_qr_used_at',
            ]);
        });
    }
};
