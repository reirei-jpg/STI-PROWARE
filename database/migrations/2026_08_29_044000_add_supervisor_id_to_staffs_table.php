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
        Schema::table(
            'staffs',
            function (Blueprint $table): void {
                $table
                    ->foreignId('supervisor_id')
                    ->nullable()
                    ->after('position_id')
                    ->constrained(
                        table: 'staffs',
                        indexName: 'staffs_supervisor_id_foreign',
                    )
                    ->nullOnDelete();
            },
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table(
            'staffs',
            function (Blueprint $table): void {
                $table->dropConstrainedForeignId(
                    'supervisor_id',
                );
            },
        );
    }
};
