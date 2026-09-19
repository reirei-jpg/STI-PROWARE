import {
    Bell,
    CheckCheck,
} from 'lucide-react';

import {
    router,
    usePage,
} from '@inertiajs/react';

import {
    useEffect,
    useRef,
    useState,
} from 'react';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface NotificationItem {
    id: number;

    type:
        string;

    title:
        string;

    message:
        string;

    link:
        string | null;

    is_read:
        boolean;

    created_at:
        string | null;
}

interface SharedPageProps {
    [key: string]:
        unknown;

    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
            role: string;
        } | null;
    };

    notifications?: {
        unread_count:
            number;

        recent:
            NotificationItem[];
    };
}

/*
|--------------------------------------------------------------------------
| Notification Bell
|--------------------------------------------------------------------------
*/

export default function NotificationBell() {
    const page =
        usePage<SharedPageProps>();

    const isSpecialistOrderVerificationPage =
        /^\/specialist\/orders\/(?:\d+|scan\/[^/]+)$/.test(
            window.location.pathname,
        );
    /*
    |--------------------------------------------------------------------------
    | Shared Notifications
    |--------------------------------------------------------------------------
    */

    const unreadCount =
        page
            .props
            .notifications
            ?.unread_count
        ?? 0;

    const recentNotifications =
        page
            .props
            .notifications
            ?.recent
        ?? [];

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [
        open,
        setOpen,
    ] =
        useState(
            false,
        );

    const wrapperRef =
        useRef<
            HTMLDivElement | null
        >(
            null,
        );

    /*
    |--------------------------------------------------------------------------
    | Close When Clicking Outside
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
    function handleClickOutside(
        event: MouseEvent,
    ) {
        const target =
            event.target;

        if (
            !(target instanceof Node)
        ) {
            return;
        }

        if (
            wrapperRef.current &&
            !wrapperRef.current.contains(
                target,
            )
        ) {
            setOpen(false);
        }
    }

    document.addEventListener(
        'mousedown',
        handleClickOutside,
    );

    return () => {
        document.removeEventListener(
            'mousedown',
            handleClickOutside,
        );
    };
}, []);

    /*
    |--------------------------------------------------------------------------
    | Lightweight Notification Polling
    |--------------------------------------------------------------------------
    |
    | Refresh every 15 seconds while the browser tab is visible.
    |
    | The old 3-second interval created too many Laravel requests.
    |
    */

    useEffect(() => {
    if (
        isSpecialistOrderVerificationPage
    ) {
        return;
    }

    const interval =
        window.setInterval(
            () => {
                if (
                    document
                        .visibilityState
                    !== 'visible'
                ) {
                    return;
                }

                router.reload({
                    only: [
                        'notifications',
                    ],
                });
            },
            15000,
        );

    return () => {
        window.clearInterval(
            interval,
        );
    };
}, [
    isSpecialistOrderVerificationPage,
]);

    /*
    |--------------------------------------------------------------------------
    | Refresh When Tab Becomes Active
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
    if (
        isSpecialistOrderVerificationPage
    ) {
        return;
    }

    const refresh =
        (): void => {
            if (
                document
                    .visibilityState
                !== 'visible'
            ) {
                return;
            }

            router.reload({
                only: [
                    'notifications',
                ],
            });
        };

    document.addEventListener(
        'visibilitychange',
        refresh,
    );

    return () => {
        document.removeEventListener(
            'visibilitychange',
            refresh,
        );
    };
}, [
    isSpecialistOrderVerificationPage,
]);

    /*
    |--------------------------------------------------------------------------
    | Toggle Notification Dropdown
    |--------------------------------------------------------------------------
    */

    const toggleBell =
        (): void => {
            const willOpen =
                !open;

            setOpen(
                willOpen,
            );

            /*
             * Always fetch the newest notifications
             * when the student opens the bell.
             */
            if (
                willOpen
            ) {
                router.reload({
                    only: [
                        'notifications',
                    ],
                });
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Open Notification
    |--------------------------------------------------------------------------
    */

    const openNotification = (
        notification:
            NotificationItem,
    ): void => {
        setOpen(
            false,
        );

        router.patch(
            `/notifications/${notification.id}/read`,
            {},
            {
                preserveScroll:
                    true,
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Mark All Notifications Read
    |--------------------------------------------------------------------------
    */

    const markAllAsRead =
        (): void => {
            if (
                unreadCount <= 0
            ) {
                return;
            }

            router.patch(
                '/notifications/read-all',
                {},
                {
                    preserveScroll:
                        true,

                    onSuccess:
                        () => {
                            setOpen(
                                false,
                            );
                        },
                },
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <div
            ref={
                wrapperRef
            }
            className="
                relative
            "
        >
            {/* NOTIFICATION BUTTON */}
            <button
                type="button"
                onClick={
                    toggleBell
                }
                aria-label={
                    `Notifications${
                        unreadCount > 0
                            ? ` (${unreadCount} unread)`
                            : ''
                    }`
                }
                title="Notifications"
                className="
                    relative
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-100
                    text-slate-600
                    transition
                    hover:bg-blue-50
                    hover:text-blue-600
                "
            >
                <Bell
                    size={20}
                />

                {/* UNREAD COUNT */}
                {unreadCount > 0 && (
                    <span
                        className="
                            absolute
                            -right-1
                            -top-1
                            flex
                            min-h-5
                            min-w-5
                            items-center
                            justify-center
                            rounded-full
                            border-2
                            border-white
                            bg-red-500
                            px-1
                            text-[9px]
                            font-black
                            text-white
                        "
                    >
                        {
                            unreadCount >
                            99
                                ? '99+'
                                : unreadCount
                        }
                    </span>
                )}
            </button>

            {/* DROPDOWN */}
            {open && (
                <div
                    className="
                        absolute
                        right-0
                        z-50
                        mt-3
                        w-[380px]
                        max-w-[calc(100vw-2rem)]
                        overflow-hidden
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        shadow-2xl
                    "
                >
                    {/* HEADER */}
                    <div
                        className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            border-b
                            border-slate-100
                            px-5
                            py-4
                        "
                    >
                        <div>
                            <h3
                                className="
                                    font-black
                                    text-slate-900
                                "
                            >
                                Notifications
                            </h3>

                            <p
                                className="
                                    mt-0.5
                                    text-xs
                                    text-slate-500
                                "
                            >
                                {
                                    unreadCount
                                }{' '}
                                unread
                            </p>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={
                                    markAllAsRead
                                }
                                className="
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    text-xs
                                    font-black
                                    text-blue-600
                                    transition
                                    hover:text-blue-800
                                "
                            >
                                <CheckCheck
                                    size={15}
                                />

                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* LIST */}
                    <div
                        className="
                            max-h-[430px]
                            overflow-y-auto
                        "
                    >
                        {recentNotifications.length >
                        0 ? (
                            recentNotifications.map(
                                (
                                    notification,
                                ) => (
                                    <button
                                        key={
                                            notification
                                                .id
                                        }
                                        type="button"
                                        onClick={() =>
                                            openNotification(
                                                notification,
                                            )
                                        }
                                        className={`
                                            block
                                            w-full
                                            border-b
                                            border-slate-100
                                            px-5
                                            py-4
                                            text-left
                                            transition

                                            ${
                                                notification
                                                    .is_read
                                                    ? 'bg-white hover:bg-slate-50'
                                                    : 'bg-blue-50/70 hover:bg-blue-50'
                                            }
                                        `}
                                    >
                                        <div
                                            className="
                                                flex
                                                items-start
                                                gap-3
                                            "
                                        >
                                            {/* READ INDICATOR */}
                                            <span
                                                className={`
                                                    mt-1.5
                                                    h-2.5
                                                    w-2.5
                                                    shrink-0
                                                    rounded-full

                                                    ${
                                                        notification
                                                            .is_read
                                                            ? 'bg-slate-300'
                                                            : 'bg-blue-600'
                                                    }
                                                `}
                                            />

                                            <div
                                                className="
                                                    min-w-0
                                                    flex-1
                                                "
                                            >
                                                {/* TYPE */}
                                                <NotificationBadge
                                                    type={
                                                        notification
                                                            .type
                                                    }
                                                />

                                                {/* TITLE */}
                                                <p
                                                    className="
                                                        mt-2
                                                        text-sm
                                                        font-black
                                                        text-slate-900
                                                    "
                                                >
                                                    {
                                                        notification
                                                            .title
                                                    }
                                                </p>

                                                {/* MESSAGE */}
                                                <p
                                                    className="
                                                        mt-1
                                                        text-xs
                                                        leading-5
                                                        text-slate-500
                                                    "
                                                >
                                                    {
                                                        notification
                                                            .message
                                                    }
                                                </p>

                                                {/* DATE */}
                                                {notification
                                                    .created_at && (
                                                    <p
                                                        className="
                                                            mt-2
                                                            text-[11px]
                                                            font-semibold
                                                            text-slate-400
                                                        "
                                                    >
                                                        {
                                                            notification
                                                                .created_at
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ),
                            )
                        ) : (
                            <EmptyNotifications />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Notification Badge
|--------------------------------------------------------------------------
*/

function NotificationBadge({
    type,
}: {
    type:
        string;
}) {
    let label =
        formatNotificationType(
            type,
        );

    let style =
        'bg-slate-100 text-slate-600';

    if (
        type ===
        'order_released'
    ) {
        label =
            'Order Released';

        style =
            'bg-emerald-100 text-emerald-700';
    }

    if (type === 'order_cancelled') {
        label = 'Order Cancelled';

        style = 'bg-red-100 text-red-700';
    }

    if (type === 'order_unclaimed_reminder') {
        label = 'Pickup Reminder';

        style = 'bg-amber-100 text-amber-700';
    }

    if (
        type ===
        'payment_confirmed'
    ) {
        label =
            'Payment Confirmed';

        style =
            'bg-blue-100 text-blue-700';
    }

    if (
        type ===
        'preorder_processed'
    ) {
        label =
            'Preorder Processed';

        style =
            'bg-violet-100 text-violet-700';
    }

    if (
        type ===
        'order_ready_for_fulfillment'
    ) {
        label =
            'Ready for Fulfillment';

        style =
            'bg-amber-100 text-amber-700';
    }

    if (
        type ===
        'order_pending_payment'
    ) {
        label =
            'Awaiting Payment';

        style =
            'bg-orange-100 text-orange-700';
    }

    return (
        <span
            className={`
                inline-flex
                rounded-full
                px-2.5
                py-1
                text-[9px]
                font-black
                uppercase
                tracking-wide
                ${style}
            `}
        >
            {label}
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

function EmptyNotifications() {
    return (
        <div
            className="
                px-6
                py-12
                text-center
            "
        >
            <Bell
                size={34}
                className="
                    mx-auto
                    text-slate-300
                "
            />

            <p
                className="
                    mt-4
                    font-black
                    text-slate-700
                "
            >
                No notifications
            </p>

            <p
                className="
                    mt-1
                    text-xs
                    text-slate-400
                "
            >
                New PROWARE notifications
                will appear here.
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function formatNotificationType(
    type:
        string,
): string {
    return type
        .replace(
            /_/g,
            ' ',
        )
        .replace(
            /\b\w/g,
            (
                character,
            ) =>
                character
                    .toUpperCase(),
        );
}