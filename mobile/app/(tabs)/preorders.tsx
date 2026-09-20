import { router, useFocusEffect } from 'expo-router';
import { Clock3, PackageOpen } from 'lucide-react-native';
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
    preorderBadge,
    type PreorderItemData,
    type PreordersResponse,
} from '@/lib/orders';

function PreorderCard({ item }: { item: PreorderItemData }) {
    const colors = preorderBadge(item.status.key);
    const canPay = item.awaiting_payment_method;

    return (
        <View className="gap-3 rounded-3xl border border-slate-200 bg-white p-4">
            <View className="flex-row gap-3">
                {item.image_url ? (
                    <Image
                        source={{ uri: item.image_url }}
                        className="h-16 w-16 rounded-2xl"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                        <PackageOpen size={22} color="#94a3b8" />
                    </View>
                )}

                <View className="flex-1 gap-1">
                    <Text
                        numberOfLines={2}
                        className="font-sans-bold text-sm leading-5 text-slate-900"
                    >
                        {item.product_name}
                    </Text>

                    <Text
                        numberOfLines={1}
                        className="font-sans-medium text-xs text-slate-500"
                    >
                        {item.variant_name} · {item.quantity} ×{' '}
                        {formatPesos(item.unit_price)}
                    </Text>

                    <Text className="font-sans text-[11px] text-slate-400">
                        {item.order_number}
                    </Text>
                </View>

                <View className="items-end justify-between">
                    <View className={`rounded-full px-3 py-1 ${colors.badge}`}>
                        <Text
                            className={`font-sans-bold text-[11px] ${colors.text}`}
                        >
                            {item.status.label}
                        </Text>
                    </View>

                    <Text className="font-sans-bold text-sm text-slate-900">
                        {formatPesos(item.line_total)}
                    </Text>
                </View>
            </View>

            <Text className="font-sans text-xs leading-5 text-slate-600">
                {item.status.description}
            </Text>

            {item.status.key === 'ready' &&
                item.preorder_payment_deadline_at && (
                    <View className="rounded-xl bg-emerald-50 px-3 py-2">
                        <Text className="font-sans-bold text-[10px] uppercase text-emerald-700">
                            Payment deadline
                        </Text>

                        <Text className="font-sans-bold text-xs text-emerald-800">
                            {item.preorder_payment_deadline_at}
                        </Text>
                    </View>
                )}

            <Pressable
                onPress={() =>
                    router.push(
                        canPay
                            ? `/pay/${item.order_id}`
                            : `/order/${item.order_id}`,
                    )
                }
                accessibilityRole="button"
                className={`rounded-full py-3 ${canPay ? 'bg-brand' : 'border border-slate-200 bg-white'}`}
            >
                {/* The label fills the button and centers itself: centering the Text box
                    instead can make Android wrap it while the custom font is measured. */}
                <Text
                    numberOfLines={1}
                    className={`text-center font-sans-bold text-sm ${canPay ? 'text-white' : 'text-slate-700'}`}
                >
                    {canPay
                        ? 'Proceed to Payment'
                        : item.status.key === 'ready'
                          ? 'View Order'
                          : 'View Details'}
                </Text>
            </Pressable>
        </View>
    );
}

export default function Preorders() {
    const insets = useSafeAreaInsets();
    const { request } = useAuth();

    const [items, setItems] = useState<PreorderItemData[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const response = await request<PreordersResponse>('/preorders');

            setItems(response.data);
            setError(null);
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        }
    }, [request]);

    // Reload whenever the tab is opened, so "ready for payment" shows up.
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

    const waitingCount =
        items?.filter((item) => item.status.key === 'waiting').length ?? 0;
    const readyCount =
        items?.filter((item) => item.status.key === 'ready').length ?? 0;

    const header = (
        <View className="px-5 pb-3" style={{ paddingTop: insets.top + 12 }}>
            <Text className="font-sans-bold text-2xl text-slate-900">
                My Preorders
            </Text>

            <Text className="font-sans text-sm text-slate-500">
                {items && items.length > 0
                    ? `${waitingCount} waiting for stock · ${readyCount} ready to pay`
                    : 'Reserve merchandise before it arrives'}
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

    if (items.length === 0) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="flex-1 items-center justify-center px-8">
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                        <Clock3 size={30} color="#0D6EFD" />
                    </View>

                    <Text className="mt-5 font-sans-bold text-xl text-slate-900">
                        No preorders yet
                    </Text>

                    <Text className="mt-2 text-center font-sans text-sm leading-6 text-slate-500">
                        Merchandise that is coming soon can be preordered from
                        the Home tab. It will appear here until it is ready to
                        pay.
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

                {items.map((item) => (
                    <PreorderCard key={item.id} item={item} />
                ))}
            </ScrollView>
        </View>
    );
}
