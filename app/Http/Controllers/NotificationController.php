<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Mark one notification as read.
     */
    public function read(
        Request $request,
        Notification $notification,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user !== null,
            401,
        );

        abort_unless(
            (int) $notification->user_id
            ===
            (int) $user->id,
            403,
        );

        $notification->markAsRead();

        if (
            filled(
                $notification->link,
            )
        ) {
            return redirect(
                $notification->link,
            );
        }

        return back();
    }

    /**
     * Mark all notifications as read.
     */
    public function readAll(
        Request $request,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user !== null,
            401,
        );

        $user
            ->prowareNotifications()
            ->whereNull(
                'read_at',
            )
            ->update([
                'read_at' => now(),
            ]);

        return back();
    }
}
