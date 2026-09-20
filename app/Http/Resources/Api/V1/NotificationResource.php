<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Notification
 */
class NotificationResource extends JsonResource
{
    /**
     * The title and message are the website's own. The website's link (a web
     * path) is turned into the order it points at, so the app never handles
     * web paths.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'order_id' => $this->orderId(),
            'is_read' => $this->read_at !== null,
            'created_at' => $this->created_at?->diffForHumans(),
            'created_at_full' => $this->created_at
                ?->copy()
                ->timezone(config('app.display_timezone'))
                ->format('M d, Y h:i A'),
        ];
    }

    /**
     * Student notifications link to /student/orders/{id} (or its receipt).
     */
    private function orderId(): ?int
    {
        return preg_match('#^/student/orders/(\d+)(?:/|$)#', (string) $this->link, $matches)
            ? (int) $matches[1]
            : null;
    }
}
