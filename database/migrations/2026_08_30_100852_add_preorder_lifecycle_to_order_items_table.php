<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'order_items',
            function (Blueprint $table): void {
                $table->string(
                    'preorder_status',
                    30,
                )
                    ->nullable()
                    ->after('item_type');

                $table->timestamp(
                    'preorder_ready_at',
                )
                    ->nullable()
                    ->after('preorder_status');

                $table->timestamp(
                    'preorder_notified_at',
                )
                    ->nullable()
                    ->after('preorder_ready_at');

                $table->timestamp(
                    'preorder_payment_deadline_at',
                )
                    ->nullable()
                    ->after('preorder_notified_at');

                $table->timestamp(
                    'preorder_paid_at',
                )
                    ->nullable()
                    ->after('preorder_payment_deadline_at');

                $table->timestamp(
                    'preorder_expired_at',
                )
                    ->nullable()
                    ->after('preorder_paid_at');

                $table->unsignedInteger(
                    'preorder_reserved_quantity',
                )
                    ->default(0)
                    ->after('preorder_expired_at');

                $table->index(
                    [
                        'item_type',
                        'preorder_status',
                    ],
                    'order_items_preorder_status_index',
                );

                $table->index(
                    'preorder_payment_deadline_at',
                    'order_items_preorder_deadline_index',
                );
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'order_items',
            function (Blueprint $table): void {
                $table->dropIndex(
                    'order_items_preorder_status_index',
                );

                $table->dropIndex(
                    'order_items_preorder_deadline_index',
                );

                $table->dropColumn([
                    'preorder_status',
                    'preorder_ready_at',
                    'preorder_notified_at',
                    'preorder_payment_deadline_at',
                    'preorder_paid_at',
                    'preorder_expired_at',
                    'preorder_reserved_quantity',
                ]);
            },
        );
    }
};
