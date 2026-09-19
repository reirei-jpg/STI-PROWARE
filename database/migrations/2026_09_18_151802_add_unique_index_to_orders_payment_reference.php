<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The application-level uniqueness check (Rule::unique) runs
     * before the order is created, so two concurrent checkouts
     * submitting the same payment reference can both pass it and
     * both save — this index is the actual backstop that makes a
     * duplicate impossible, not just discouraged. Postgres treats
     * multiple NULLs as distinct, so unpaid/preorder-only orders
     * with no reference yet are unaffected.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unique('payment_reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['payment_reference']);
        });
    }
};
