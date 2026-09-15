<?php

namespace App\Http\Middleware;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template loaded on the first page visit.
     */
    protected $rootView = 'app';

    /**
     * Define the props shared with every Inertia response.
     */
    public function share(
        Request $request,
    ): array {
        /*
        |--------------------------------------------------------------------------
        | Authenticated User
        |--------------------------------------------------------------------------
        */

        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Safe Notification Defaults
        |--------------------------------------------------------------------------
        */

        $notifications = [
            'unread_count' => 0,
            'recent' => [],
        ];

        /*
        |--------------------------------------------------------------------------
        | Authenticated Notifications
        |--------------------------------------------------------------------------
        |
        | Query notifications directly using the authenticated users.id.
        |
        | This deliberately avoids relying on a model relationship while we
        | verify the Student notification pipeline.
        |
        */

        if (
            $user !== null
        ) {
            $notificationQuery =
                Notification::query()
                    ->where(
                        'user_id',
                        $user->id,
                    );

            $unreadCount =
                (clone $notificationQuery)
                    ->whereNull(
                        'read_at',
                    )
                    ->count();

            $recentNotifications =
                (clone $notificationQuery)
                    ->latest(
                        'created_at',
                    )
                    ->latest(
                        'id',
                    )
                    ->limit(
                        10,
                    )
                    ->get()
                    ->map(
                        function (
                            Notification $notification,
                        ): array {
                            return [
                                'id' => $notification->id,

                                'type' => $notification->type,

                                'title' => $notification->title,

                                'message' => $notification->message,

                                'link' => $notification->link,

                                'is_read' => $notification->read_at
                                    !== null,

                                'created_at' => $notification
                                    ->created_at
                                    ?->diffForHumans(),
                            ];
                        },
                    )
                    ->values()
                    ->all();

            $notifications = [
                'unread_count' => $unreadCount,

                'recent' => $recentNotifications,
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Safe Cart Defaults
        |--------------------------------------------------------------------------
        */

        $cart = [
            'count' => 0,
        ];

        /*
        |--------------------------------------------------------------------------
        | Student Cart Count
        |--------------------------------------------------------------------------
        |
        | Shared on every page (not just /cart and /checkout) so the navbar
        | cart badge stays accurate no matter which page the student is
        | currently viewing.
        |
        */

        if (
            $user !== null
            && $user->role === 'student'
        ) {
            $student =
                $user->student;

            if ($student) {
                $activeCart =
                    Cart::query()
                        ->where(
                            'student_id',
                            $student->id,
                        )
                        ->where(
                            'created_by',
                            $user->id,
                        )
                        ->where(
                            'source',
                            Cart::SOURCE_STUDENT_APP,
                        )
                        ->where(
                            'status',
                            Cart::STATUS_ACTIVE,
                        )
                        ->first([
                            'id',
                        ]);

                if ($activeCart) {
                    $cart['count'] =
                        (int) CartItem::query()
                            ->where(
                                'cart_id',
                                $activeCart->id,
                            )
                            ->sum('quantity');
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Shared Inertia Data
        |--------------------------------------------------------------------------
        */

        return [
            ...parent::share(
                $request,
            ),

            'name' => config(
                'app.name',
            ),

            /*
            |--------------------------------------------------------------------------
            | Authentication
            |--------------------------------------------------------------------------
            */

            'auth' => [
            'user' => $user,
            ],

            /*
            |--------------------------------------------------------------------------
            | Sidebar
            |--------------------------------------------------------------------------
            */

            'sidebarOpen' => ! $request->hasCookie(
                'sidebar_state',
            )
                ||
                $request->cookie(
                    'sidebar_state',
                ) === 'true',

            /*
            |--------------------------------------------------------------------------
            | Notifications
            |--------------------------------------------------------------------------
            */

            'notifications' => $notifications,

            /*
            |--------------------------------------------------------------------------
            | Cart
            |--------------------------------------------------------------------------
            */

            'cart' => $cart,

            /*
            |--------------------------------------------------------------------------
            | Flash Messages
            |--------------------------------------------------------------------------
            */

            'flash' => [
                'success' => fn () => $request
                    ->session()
                    ->get(
                        'success',
                    ),

                'error' => fn () => $request
                    ->session()
                    ->get(
                        'error',
                    ),
            ],
        ];
    }
}
