<?php

namespace App\Jobs;

use App\Enums\PushResult;
use App\Models\DeviceToken;
use App\Models\Notification;
use App\Services\FcmClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Sends one in-app notification to the owner's phones as a push notification.
 *
 * Best effort by design: the notification already exists in the app, so a
 * failed push is dropped rather than retried into duplicates.
 */
class SendPushNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(
        public readonly int $notificationId,
    ) {}

    public function handle(FcmClient $fcm): void
    {
        $notification = Notification::query()->find($this->notificationId);

        if (! $notification || ! $fcm->isConfigured()) {
            return;
        }

        DeviceToken::query()
            ->where('user_id', $notification->user_id)
            ->get()
            ->each(function (DeviceToken $device) use ($fcm, $notification): void {
                $result = $fcm->send(
                    deviceToken: $device->token,
                    title: $notification->title,
                    body: $notification->message,
                    data: [
                        'notification_id' => $notification->id,
                        'order_id' => $notification->studentOrderId(),
                        'type' => $notification->type,
                    ],
                );

                if ($result === PushResult::InvalidToken) {
                    $device->delete();
                }
            });
    }
}
