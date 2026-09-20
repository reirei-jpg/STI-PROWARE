import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, PackageOpen } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatPesos } from '@/lib/format';
import {
    statusBadge,
    type OrderSummary,
    type OrdersResponse,
} from '@/lib/orders';

function OrderCard({ order }: { order: OrderSummary }) {
    const colors = statusBadge(order.status.key);
    const preview = order.preview_item;

    return (
        <Pressable
            onPress={() => router.push(`/order/${order.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Order ${order.order_number}`}
            className="gap-3 rounded-3xl border border-slate-200 bg-white p-4"
        >
            <View className="flex-row items-center justify-between gap-2">
                <Text
                    numberOfLines={1}
                    className="flex-1 font-sans-bold text-sm text-slate-900"
                >
                    {order.order_number}
                </Text>

                <View className={`rounded-full px-3 py-1 ${colors.badge}`}>
                    <Text className={`font-sans-bold text-[11px] ${colors.text}`}>
                        {order.status.label}
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center gap-3">
                {preview?.image_url ? (
                    <Image
                        source={{ uri: preview.image_url }}
                        className="h-14 w-14 rounded-xl"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
                        <PackageOpen size={20} color="#94a3b8" />
                    </View>
                )}

                <View className="flex-1">
                    <Text
                        numberOfLines={1}
                        className="font-sans-semibold text-sm text-slate-800"
                    >
                        {preview?.product_name ?? 'Order'}
                    </Text>

                    <Text className="font-sans text-xs text-slate-500">
                        {order.additional_items_count > 0
                            ? `+ ${order.additional_items_count} more item${order.additional_items_count === 1 ? '' : 's'}`
                            : (preview?.variant_name ?? '')}
                    </Text>
                </View>

                <ChevronRight size={18} color="#94a3b8" />
            </View>

            <View className="flex-row items-center justify-between border-t border-slate-100 pt-3">
                <Text className="font-sans text-xs text-slate-500">
                    {order.created_at} · {order.total_quantity} item
                    {order.total_quantity === 1 ? '' : 's'}
                </Text>

                <Text className="font-sans-bold text-base text-slate-900">
                    {formatPesos(order.total)}
                </Text>
            </View>
        </Pressable>
    );
}

export default function Orders() {
    const insets = useSafeAreaInsets();
    const { request } = useAuth();

    const [orders, setOrders] = useState<OrderSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const response = await request<OrdersResponse>('/orders');

            setOrders(response.data);
            setError(null);
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        }
    }, [request]);

    // Reload every time the tab is opened, so a new order or a status change
    // (payment confirmed, ready for pickup) shows up without pulling down.
    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load]),
    );

    const pullToRefresh = async (): Promise<void> => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const header = (
        <View className="px-5 pb-3" style={{ paddingTop: insets.top + 12 }}>
            <Text className="font-sans-bold text-2xl text-slate-900">
                My Orders
            </Text>

            <Text className="font-sans text-sm text-slate-500">
                Payment QR codes and pickup status
            </Text>
        </View>
    );

    if (orders === null && !error) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0D6EFD" />
                </View>
            </View>
        );
    }

    if (orders === null) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="items-center gap-3 px-8 pt-10">
                    <Text className="text-center font-sans-semibold text-sm text-red-700">
                        {error}
                    </Text>

                    <Pressable
                        onPress={() => void load()}
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

    if (orders.length === 0) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="flex-1 items-center justify-center px-8">
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                        <PackageOpen size={30} color="#0D6EFD" />
                    </View>

                    <Text className="mt-5 font-sans-bold text-xl text-slate-900">
                        No orders yet
                    </Text>

                    <Text className="mt-2 text-center font-sans text-sm leading-6 text-slate-500">
                        When you check out, your orders and their payment QR
                        codes will appear here.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-page">
            {header}

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: 24,
                    gap: 12,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => void pullToRefresh()}
                    />
                }
            >
                {error && (
                    <View className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
                        <Text className="font-sans-semibold text-xs leading-5 text-red-700">
                            {error}
                        </Text>
                    </View>
                )}

                {orders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                ))}
            </ScrollView>
        </View>
    );
}
