<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The 12% VAT already included in every listed price.
     *
     * This does not add anything to what a student pays.
     * It only discloses how much of the existing total is tax,
     * matching a standard Philippine VAT-inclusive receipt.
     */
    private const TAX_RATE = 0.12;

    /**
     * Add the tax breakdown columns and backfill existing
     * paid orders so their receipts also show the breakdown.
     */
    public function up(): void
    {
        Schema::table(
            'orders',
            function (Blueprint $table): void {
                /*
                 * The VAT rate in effect when this order was
                 * created, stored per order so a future rate
                 * change never silently rewrites old receipts.
                 */
                $table->decimal(
                    'tax_rate',
                    5,
                    2,
                )
                    ->nullable()
                    ->after('total');

                /*
                 * The portion of `total` that is VAT.
                 *
                 * `total` itself is unchanged by this column.
                 * This only discloses a breakdown of it.
                 */
                $table->decimal(
                    'tax_amount',
                    12,
                    2,
                )
                    ->nullable()
                    ->after('tax_rate');
            },
        );

        /*
        |--------------------------------------------------------------------------
        | Backfill Existing Orders
        |--------------------------------------------------------------------------
        |
        | Every order created before this column existed already
        | charged VAT-inclusive prices, it was simply never shown
        | as a separate breakdown. Backfill using today's rate so
        | older receipts can display it too.
        */

        DB::table('orders')
            ->orderBy('id')
            ->chunkById(
                200,
                function ($orders): void {
                    foreach ($orders as $order) {
                        $total = (float) $order->total;

                        $taxAmount = round(
                            $total * (self::TAX_RATE / (1 + self::TAX_RATE)),
                            2,
                        );

                        DB::table('orders')
                            ->where('id', $order->id)
                            ->update([
                                'tax_rate' => self::TAX_RATE * 100,
                                'tax_amount' => $taxAmount,
                            ]);
                    }
                },
            );
    }

    /**
     * Remove the tax breakdown columns.
     */
    public function down(): void
    {
        Schema::table(
            'orders',
            function (Blueprint $table): void {
                $table->dropColumn([
                    'tax_rate',
                    'tax_amount',
                ]);
            },
        );
    }
};
