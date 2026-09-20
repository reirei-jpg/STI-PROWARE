<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\NotificationResource;
use App\Models\Notification;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    private const PER_PAGE = 15;

    /**
     * The signed-in student's notifications, newest first, with how many are
     * still unread (across all pages).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = $user->prowareNotifications()
            ->latest('created_at')
            ->latest('id')
            ->paginate(self::PER_PAGE);

        return response()->json([
            'data' => NotificationResource::collection($notifications->items())->resolve(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
            'unread_count' => $this->unreadCount($request),
        ]);
    }

    /**
     * Mark one notification as read, like the website. The app then opens the
     * order named in the returned notification.
     *
     * @throws AuthorizationException
     */
    public function read(Request $request, Notification $notification): JsonResponse
    {
        if ((int) $notification->user_id !== (int) $request->user()->id) {
            throw new AuthorizationException('You are not allowed to open this notification.');
        }

        $notification->markAsRead();

        return response()->json([
            'data' => new NotificationResource($notification),
            'unread_count' => $this->unreadCount($request),
        ]);
    }

    /**
     * Mark every unread notification as read.
     */
    public function readAll(Request $request): JsonResponse
    {
        $request->user()
            ->prowareNotifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'unread_count' => 0,
        ]);
    }

    private function unreadCount(Request $request): int
    {
        return $request->user()
            ->prowareNotifications()
            ->whereNull('read_at')
            ->count();
    }
}
