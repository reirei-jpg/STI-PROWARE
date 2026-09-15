<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'purchase_orders',
            function (Blueprint $table): void {
                $table
                    ->timestamp('archived_at')
                    ->nullable()
                    ->after('completed_at');

                $table
                    ->foreignId('archived_by')
                    ->nullable()
                    ->after('archived_at')
                    ->constrained('users')
                    ->nullOnDelete();
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'purchase_orders',
            function (Blueprint $table): void {
                $table->dropForeign([
                    'archived_by',
                ]);

                $table->dropColumn([
                    'archived_at',
                    'archived_by',
                ]);
            },
        );
    }
};
