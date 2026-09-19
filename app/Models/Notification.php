<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    public const TYPE_PAYMENT_CONFIRMED =
        'payment_confirmed';

    /*
    |--------------------------------------------------------------------------
    | New Order Notification
    |--------------------------------------------------------------------------
    |
    | Sent to every Cashier when a student places an order that
    | requires payment verification.
    |
    */

    public const TYPE_ORDER_PENDING_PAYMENT =
        'order_pending_payment';

    public const TYPE_ORDER_READY_FOR_FULFILLMENT =
        'order_ready_for_fulfillment';

    /*
    |--------------------------------------------------------------------------
    | Student Pickup Notification
    |--------------------------------------------------------------------------
    |
    | Sent when the Specialist marks a paid order as prepared and ready
    | for the student to claim at PROWARE.
    |
    */

    public const TYPE_ORDER_READY_FOR_PICKUP =
        'order_ready_for_pickup';

    public const TYPE_ORDER_RELEASED =
        'order_released';

    public const TYPE_ORDER_CANCELLED =
        'order_cancelled';

    public const TYPE_ORDER_UNCLAIMED_REMINDER =
        'order_unclaimed_reminder';

    public const TYPE_LOW_STOCK =
        'low_stock';

    public const TYPE_OUT_OF_STOCK =
        'out_of_stock';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'link',
        'data',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',

            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'user_id',
        );
    }

    public function markAsRead(): void
    {
        if (
            $this->read_at
            !== null
        ) {
            return;
        }

        $this->update([
            'read_at' => now(),
        ]);
    }

    public function markAsUnread(): void
    {
        $this->update([
            'read_at' => null,
        ]);
    }
}
