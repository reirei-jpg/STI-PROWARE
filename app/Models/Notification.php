<?php

namespace App\Models;

use App\Jobs\SendPushNotification;
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

    /**
     * A new notification also goes to the owner's phones as a push, but only
     * when they have registered one (so most notifications queue nothing).
     */
    protected static function booted(): void
    {
        static::created(function (Notification $notification): void {
            if (DeviceToken::query()->where('user_id', $notification->user_id)->exists()) {
                SendPushNotification::dispatch($notification->id)->afterCommit();
            }
        });
    }

    /**
     * The order a student notification is about, taken from its link
     * (/student/orders/{id}, or its receipt), or null when it is not about one.
     */
    public function studentOrderId(): ?int
    {
        return preg_match('#^/student/orders/(\d+)(?:/|$)#', (string) $this->link, $matches)
            ? (int) $matches[1]
            : null;
    }

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
