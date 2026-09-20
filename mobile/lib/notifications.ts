export type NotificationData = {
    id: number;
    type: string;
    title: string;
    message: string;
    /** The order the notification is about, when it is about one. */
    order_id: number | null;
    is_read: boolean;
    /** Like the website: "5 minutes ago". */
    created_at: string | null;
    /** Manila time, for example "Sep 01, 2026 08:30 AM". */
    created_at_full: string | null;
};

export type NotificationsResponse = {
    data: NotificationData[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    unread_count: number;
};

export type NotificationReadResponse = {
    data: NotificationData;
    unread_count: number;
};

export type NotificationsReadAllResponse = { unread_count: number };
