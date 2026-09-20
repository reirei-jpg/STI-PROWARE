import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from './auth';
import { useNotifications } from './notifications-context';

type NotificationsModule = typeof import('expo-notifications');

/** The notification channel the server names in every push ("orders"). */
const CHANNEL_ID = 'orders';

/*
 * Push notifications need our own build of the app. Expo Go on Android cannot
 * receive them (and complains when the module is even touched), so everything
 * here is skipped there and loaded only when it can work.
 */
const runsInExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function loadNotifications(): Promise<NotificationsModule | null> {
    if (runsInExpoGo || Platform.OS !== 'android') {
        return null;
    }

    return import('expo-notifications');
}

/** Asks for permission (Android 13+ shows a prompt) and returns whether it was given. */
async function ensurePermission(
    Notifications: NotificationsModule,
): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();

    if (current.granted) {
        return true;
    }

    const asked = await Notifications.requestPermissionsAsync();

    return asked.granted;
}

/** Opens the order a tapped notification is about (or the list when it names none). */
function openFrom(response: {
    notification: { request: { content: { data?: Record<string, unknown> } } };
}): void {
    const orderId = Number(response.notification.request.content.data?.order_id);

    if (Number.isInteger(orderId) && orderId > 0) {
        router.push(`/order/${orderId}`);
    } else {
        router.push('/notifications');
    }
}

/**
 * Renders nothing. While a student is signed in it asks for notification
 * permission, gives the server this phone's Firebase token, keeps the bell's
 * count fresh when a push arrives, and opens the right order when one is
 * tapped.
 */
export default function PushHandler() {
    const { user, request } = useAuth();
    const { refreshUnreadCount } = useNotifications();

    // A tap can be reported twice (cold start and listener): open it once.
    const handled = useRef<string | null>(null);

    useEffect(() => {
        if (!user) {
            return;
        }

        let cancelled = false;
        const cleanups: (() => void)[] = [];

        const registerToken = async (token: string): Promise<void> => {
            try {
                await request('/device-token', {
                    method: 'PUT',
                    body: {
                        token,
                        device_name: Device.deviceName ?? Device.modelName,
                    },
                });
            } catch {
                // Push is a convenience; the notification list still works.
            }
        };

        void (async () => {
            const Notifications = await loadNotifications();

            if (!Notifications || cancelled) {
                return;
            }

            try {
                Notifications.setNotificationHandler({
                    handleNotification: async () => ({
                        shouldShowBanner: true,
                        shouldShowList: true,
                        shouldPlaySound: true,
                        shouldSetBadge: false,
                    }),
                });

                await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
                    name: 'Order updates',
                    importance: Notifications.AndroidImportance.HIGH,
                });

                const received = Notifications.addNotificationReceivedListener(
                    () => void refreshUnreadCount(),
                );
                const tapped =
                    Notifications.addNotificationResponseReceivedListener(
                        (response) => {
                            const id = response.notification.request.identifier;

                            if (handled.current !== id) {
                                handled.current = id;
                                openFrom(response);
                            }
                        },
                    );
                const refreshed = Notifications.addPushTokenListener(
                    (token) => void registerToken(String(token.data)),
                );

                cleanups.push(
                    () => received.remove(),
                    () => tapped.remove(),
                    () => refreshed.remove(),
                );

                // The app was closed and a notification opened it.
                const last = await Notifications.getLastNotificationResponseAsync();

                if (last && handled.current !== last.notification.request.identifier) {
                    handled.current = last.notification.request.identifier;
                    openFrom(last);
                }

                if (await ensurePermission(Notifications)) {
                    const token = await Notifications.getDevicePushTokenAsync();

                    await registerToken(String(token.data));
                }
            } catch (caught) {
                // No Firebase in this build, or the phone refused: carry on
                // without push rather than disturb the student.
                console.log('Push notifications are not available:', caught);
            }
        })();

        return () => {
            cancelled = true;
            cleanups.forEach((cleanup) => cleanup());
        };
    }, [user, request, refreshUnreadCount]);

    return null;
}
