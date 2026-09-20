import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { useAuth } from './auth';
import type { NotificationsResponse } from './notifications';

type NotificationsContextValue = {
    /** Unread notifications, for the bell badge. */
    unreadCount: number;
    /** Asks the server how many are unread. Quiet if it cannot be reached. */
    refreshUnreadCount: () => Promise<void>;
    /** Screens that already know the new count (after reading) set it here. */
    setUnreadCount: (count: number) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
    null,
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const { user, request } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshUnreadCount = useCallback(async () => {
        try {
            const response =
                await request<NotificationsResponse>('/notifications');

            setUnreadCount(response.unread_count);
        } catch {
            // The badge is a convenience: keep the last known count.
        }
    }, [request]);

    // Load the count when a student signs in; forget it when they sign out.
    useEffect(() => {
        if (user) {
            void refreshUnreadCount();
        } else {
            setUnreadCount(0);
        }
    }, [user, refreshUnreadCount]);

    const value = useMemo(
        () => ({ unreadCount, refreshUnreadCount, setUnreadCount }),
        [unreadCount, refreshUnreadCount],
    );

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications(): NotificationsContextValue {
    const context = useContext(NotificationsContext);

    if (!context) {
        throw new Error(
            'useNotifications must be used inside <NotificationsProvider>.',
        );
    }

    return context;
}
