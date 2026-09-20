import { router } from 'expo-router';
import {
    ArrowLeft,
    Bell,
    CircleCheck,
    Clock3,
    PackageCheck,
    XCircle,
    type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type {
    NotificationData,
    NotificationReadResponse,
    NotificationsReadAllResponse,
    NotificationsResponse,
} from '@/lib/notifications';
import { useNotifications } from '@/lib/notifications-context';

/** An icon and its colors for each kind of notification the server sends. */
function look(type: string): { Icon: LucideIcon; box: string; color: string } {
    switch (type) {
        case 'payment_confirmed':
            return { Icon: CircleCheck, box: 'bg-blue-100', color: '#1d4ed8' };
        case 'order_ready_for_pickup':
        case 'order_released':
            return { Icon: PackageCheck, box: 'bg-emerald-100', color: '#047857' };
        case 'preorder_ready':
            return { Icon: PackageCheck, box: 'bg-blue-100', color: '#1d4ed8' };
        case 'order_cancelled':
            return { Icon: XCircle, box: 'bg-red-100', color: '#b91c1c' };
        case 'order_unclaimed_reminder':
            return { Icon: Clock3, box: 'bg-amber-100', color: '#b45309' };
        default:
            return { Icon: Bell, box: 'bg-slate-100', color: '#475569' };
    }
}

function NotificationRow({
    item,
    onPress,
}: {
    item: NotificationData;
    onPress: () => void;
}) {
    const { Icon, box, color } = look(item.type);

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${item.is_read ? '' : 'Unread. '}${item.title}`}
            className={`flex-row gap-3 rounded-3xl border p-4 ${item.is_read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50'}`}
        >
            <View
                className={`h-11 w-11 items-center justify-center rounded-2xl ${box}`}
            >
                <Icon size={20} color={color} />
            </View>

            <View className="flex-1 gap-1">
                <View className="flex-row items-center justify-between gap-2">
                    <Text
                        numberOfLines={2}
                        className={`flex-1 text-sm leading-5 text-slate-900 ${item.is_read ? 'font-sans-semibold' : 'font-sans-bold'}`}
                    >
                        {item.title}
                    </Text>

                    {!item.is_read && (
                        <View className="h-2.5 w-2.5 rounded-full bg-brand" />
                    )}
                </View>

                <Text className="font-sans text-sm leading-5 text-slate-600">
                    {item.message}
                </Text>

                <Text className="font-sans text-xs text-slate-400">
                    {item.created_at_full}
                    {item.created_at ? ` · ${item.created_at}` : ''}
                </Text>
            </View>
        </Pressable>
    );
}

export default function Notifications() {
    const insets = useSafeAreaInsets();
    const { request } = useAuth();
    const { unreadCount, setUnreadCount } = useNotifications();

    const [items, setItems] = useState<NotificationData[] | null>(null);
    const [page, setPage] = useState(0);
    const [lastPage, setLastPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const latestRequest = useRef(0);

    const load = useCallback(
        async (target: number, mode: 'reset' | 'more') => {
            const id = ++latestRequest.current;

            try {
                const response = await request<NotificationsResponse>(
                    `/notifications?page=${target}`,
                );

                // A newer load has started; ignore this answer.
                if (id !== latestRequest.current) {
                    return;
                }

                setItems((current) =>
                    mode === 'more' && current
                        ? [...current, ...response.data]
                        : response.data,
                );
                setPage(response.meta.current_page);
                setLastPage(response.meta.last_page);
                setUnreadCount(response.unread_count);
                setError(null);
            } catch (caught) {
                if (id === latestRequest.current) {
                    setError(
                        caught instanceof ApiError
                            ? caught.message
                            : 'Something went wrong. Please try again.',
                    );
                }
            }
        },
        [request, setUnreadCount],
    );

    useEffect(() => {
        void load(1, 'reset');
    }, [load]);

    const pullToRefresh = async (): Promise<void> => {
        setRefreshing(true);
        await load(1, 'reset');
        setRefreshing(false);
    };

    const loadMore = async (): Promise<void> => {
        if (loadingMore || page >= lastPage) {
            return;
        }

        setLoadingMore(true);
        await load(page + 1, 'more');
        setLoadingMore(false);
    };

    // Opening a notification marks it read (like the website), then goes to
    // the order it is about.
    const open = async (item: NotificationData): Promise<void> => {
        if (!item.is_read) {
            setItems((current) =>
                current
                    ? current.map((row) =>
                          row.id === item.id ? { ...row, is_read: true } : row,
                      )
                    : current,
            );

            try {
                const response = await request<NotificationReadResponse>(
                    `/notifications/${item.id}/read`,
                    { method: 'PATCH' },
                );

                setUnreadCount(response.unread_count);
            } catch {
                // Reading is best effort; the next refresh shows the truth.
            }
        }

        if (item.order_id !== null) {
            router.push(`/order/${item.order_id}`);
        }
    };

    const markAllRead = async (): Promise<void> => {
        setMarkingAll(true);

        try {
            const response = await request<NotificationsReadAllResponse>(
                '/notifications/read-all',
                { method: 'PATCH' },
            );

            setItems((current) =>
                current
                    ? current.map((row) => ({ ...row, is_read: true }))
                    : current,
            );
            setUnreadCount(response.unread_count);
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setMarkingAll(false);
        }
    };

    const header = (
        <View
            className="flex-row items-center gap-3 px-5 pb-3"
            style={{ paddingTop: insets.top + 12 }}
        >
            <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
            >
                <ArrowLeft size={20} color="#0f172a" />
            </Pressable>

            <Text className="flex-1 font-sans-bold text-2xl text-slate-900">
                Notifications
            </Text>
        </View>
    );

    if (items === null && !error) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0D6EFD" />
                </View>
            </View>
        );
    }

    if (items === null) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="items-center gap-3 px-8 pt-10">
                    <Text className="text-center font-sans-semibold text-sm text-red-700">
                        {error}
                    </Text>

                    <Pressable
                        onPress={() => void load(1, 'reset')}
                        accessibilityRole="button"
                        className="rounded-full bg-red-600 px-5 py-2"
                    >
                        <Text className="font-sans-bold text-sm text-white">
                            Try again
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-page">
            {header}

            {items.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8">
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                        <Bell size={30} color="#0D6EFD" />
                    </View>

                    <Text className="mt-5 font-sans-bold text-xl text-slate-900">
                        No notifications yet
                    </Text>

                    <Text className="mt-2 text-center font-sans text-sm leading-6 text-slate-500">
                        Updates about your orders, such as payment confirmed or
                        ready for pickup, will show up here.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingBottom: insets.bottom + 24,
                        gap: 12,
                    }}
                    ListHeaderComponent={
                        <View className="gap-3">
                            {error && (
                                <View className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
                                    <Text className="font-sans-semibold text-xs leading-5 text-red-700">
                                        {error}
                                    </Text>
                                </View>
                            )}

                            {unreadCount > 0 && (
                                <Pressable
                                    onPress={() => void markAllRead()}
                                    disabled={markingAll}
                                    accessibilityRole="button"
                                    className="flex-row items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2"
                                >
                                    {markingAll && (
                                        <ActivityIndicator
                                            size="small"
                                            color="#0D6EFD"
                                        />
                                    )}

                                    <Text className="font-sans-semibold text-sm text-slate-700">
                                        Mark all as read ({unreadCount})
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <NotificationRow
                            item={item}
                            onPress={() => void open(item)}
                        />
                    )}
                    onEndReached={() => void loadMore()}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator
                                size="small"
                                color="#0D6EFD"
                                className="py-4"
                            />
                        ) : null
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => void pullToRefresh()}
                        />
                    }
                />
            )}
        </View>
    );
}
