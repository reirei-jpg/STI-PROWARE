import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, PackageOpen, QrCode } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { SvgXml } from 'react-native-svg';
import {
    ActivityIndicator,
    Alert,
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
    paymentMethodName,
    statusBadge,
    type OrderChangeResponse,
    type OrderDetail,
    type OrderItemData,
    type OrderQrResponse,
    type OrderResponse,
} from '@/lib/orders';

function DetailLine({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row items-start justify-between gap-4">
            <Text className="font-sans-medium text-sm text-slate-500">
                {label}
            </Text>

            <Text className="flex-1 text-right font-sans-semibold text-sm text-slate-900">
                {value}
            </Text>
        </View>
    );
}

function ItemRow({ item }: { item: OrderItemData }) {
    return (
        <View className="flex-row gap-3">
            {item.image_url ? (
                <Image
                    source={{ uri: item.image_url }}
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

                {item.item_type === 'preorder' && (
                    <Text className="font-sans-bold text-[11px] text-blue-700">
                        Preorder
                        {item.preorder_status
                            ? ` · ${item.preorder_status}`
                            : ''}
                    </Text>
                )}
            </View>

            <Text className="font-sans-bold text-sm text-slate-900">
                {formatPesos(item.line_total)}
            </Text>
        </View>
    );
}

export default function OrderDetails() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { request } = useAuth();

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [qrSvg, setQrSvg] = useState<string | null>(null);
    const [qrError, setQrError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const response = await request<OrderResponse>(`/orders/${id}`);

            setOrder(response.data);
            setError(null);
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        }
    }, [request, id]);

    useEffect(() => {
        void load();
    }, [load]);

    // The QR is fetched as drawing text and painted by the app. It is loaded
    // again whenever the kind changes (Payment becomes Release once paid).
    const qrKind = order?.qr.kind ?? null;
    const statusKey = order?.status.key ?? null;

    const loadQr = useCallback(async () => {
        setQrError(null);

        try {
            const response = await request<OrderQrResponse>(`/orders/${id}/qr`);

            setQrSvg(response.data.svg);
        } catch (caught) {
            setQrSvg(null);
            setQrError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        }
    }, [request, id]);

    useEffect(() => {
        setQrSvg(null);

        if (qrKind) {
            void loadQr();
        } else {
            setQrError(null);
        }
    }, [qrKind, statusKey, loadQr]);

    const pullToRefresh = async (): Promise<void> => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const cancelOrder = async (): Promise<void> => {
        setCancelling(true);
        setCancelError(null);

        try {
            const response = await request<OrderChangeResponse>(
                `/orders/${id}/cancel`,
                { method: 'POST', body: {} },
            );

            setOrder(response.data);
            setNotice(response.message);
        } catch (caught) {
            setCancelError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setCancelling(false);
        }
    };

    const confirmCancel = (): void => {
        Alert.alert(
            'Cancel this order?',
            'The merchandise reserved for you will be given back. This cannot be undone.',
            [
                { text: 'Keep order', style: 'cancel' },
                {
                    text: 'Cancel order',
                    style: 'destructive',
                    onPress: () => void cancelOrder(),
                },
            ],
        );
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

            <Text className="font-sans-bold text-2xl text-slate-900">
                Order Details
            </Text>
        </View>
    );

    if (!order) {
        return (
            <View className="flex-1 bg-page">
                {header}

                {error ? (
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
                ) : (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#0D6EFD" />
                    </View>
                )}
            </View>
        );
    }

    const colors = statusBadge(order.status.key);

    return (
        <View className="flex-1 bg-page">
            {header}

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: insets.bottom + 24,
                    gap: 16,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => void pullToRefresh()}
                    />
                }
            >
                {notice && (
                    <View className="rounded-2xl border border-green-200 bg-green-50 px-3 py-2">
                        <Text className="font-sans-semibold text-xs leading-5 text-green-800">
                            {notice}
                        </Text>
                    </View>
                )}

                <View className="gap-3 rounded-3xl border border-slate-200 bg-white p-4">
                    <View className="flex-row items-center justify-between gap-2">
                        <Text
                            numberOfLines={1}
                            className="flex-1 font-sans-bold text-base text-slate-900"
                        >
                            {order.order_number}
                        </Text>

                        <View
                            className={`rounded-full px-3 py-1 ${colors.badge}`}
                        >
                            <Text
                                className={`font-sans-bold text-[11px] ${colors.text}`}
                            >
                                {order.status.label}
                            </Text>
                        </View>
                    </View>

                    <Text className="font-sans text-sm leading-6 text-slate-600">
                        {order.status.description}
                    </Text>

                    <View className="gap-2 border-t border-slate-100 pt-3">
                        <DetailLine
                            label="Placed"
                            value={order.created_at ?? '-'}
                        />

                        <DetailLine
                            label="Payment"
                            value={paymentMethodName(order.payment_method)}
                        />

                        {order.paid_at && (
                            <DetailLine label="Paid" value={order.paid_at} />
                        )}

                        {order.ready_for_release_at && (
                            <DetailLine
                                label="Ready for pickup"
                                value={order.ready_for_release_at}
                            />
                        )}

                        {order.released_at && (
                            <DetailLine
                                label="Released"
                                value={order.released_at}
                            />
                        )}

                        {order.cancelled_at && (
                            <DetailLine
                                label="Cancelled"
                                value={order.cancelled_at}
                            />
                        )}

                        {order.transaction_number && (
                            <DetailLine
                                label="Transaction"
                                value={order.transaction_number}
                            />
                        )}
                    </View>
                </View>

                {order.status.key !== 'cancelled' && (
                    <View className="items-center gap-3 rounded-3xl border border-blue-200 bg-blue-50 p-4">
                        <View className="flex-row items-center gap-2">
                            <QrCode size={18} color="#0D6EFD" />

                            <Text className="font-sans-bold text-base text-slate-900">
                                {order.qr.kind ? order.qr.title : 'QR code'}
                            </Text>
                        </View>

                        <Text className="text-center font-sans text-sm leading-6 text-slate-600">
                            {order.qr.message}
                        </Text>

                        {order.qr.kind && qrSvg && (
                            <View
                                className="rounded-2xl bg-white p-3"
                                accessibilityLabel={`${order.qr.kind === 'release' ? 'Release' : 'Payment'} QR for ${order.order_number}`}
                            >
                                <SvgXml xml={qrSvg} width={256} height={256} />
                            </View>
                        )}

                        {order.qr.kind && !qrSvg && !qrError && (
                            <View className="h-64 w-64 items-center justify-center rounded-2xl bg-white">
                                <ActivityIndicator
                                    size="large"
                                    color="#0D6EFD"
                                />
                            </View>
                        )}

                        {order.qr.kind && qrError && (
                            <View className="items-center gap-2 rounded-2xl bg-white p-4">
                                <Text className="text-center font-sans-semibold text-xs leading-5 text-red-700">
                                    {qrError}
                                </Text>

                                <Pressable
                                    onPress={() => void loadQr()}
                                    accessibilityRole="button"
                                    className="rounded-full bg-red-600 px-5 py-2"
                                >
                                    <Text className="font-sans-bold text-sm text-white">
                                        Try again
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                <View className="gap-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <Text className="font-sans-bold text-base text-slate-900">
                        Items
                    </Text>

                    {order.items.map((item) => (
                        <ItemRow key={item.id} item={item} />
                    ))}

                    <View className="flex-row items-center justify-between border-t border-slate-100 pt-3">
                        <Text className="font-sans-medium text-sm text-slate-500">
                            Total
                        </Text>

                        <Text className="font-sans-bold text-lg text-slate-900">
                            {formatPesos(order.total)}
                        </Text>
                    </View>
                </View>

                {order.cancellation && (
                    <View className="gap-1 rounded-3xl border border-red-200 bg-red-50 p-4">
                        <Text className="font-sans-bold text-sm text-red-800">
                            Order cancelled
                        </Text>

                        {order.cancellation.reason && (
                            <Text className="font-sans text-sm leading-6 text-red-800">
                                Reason: {order.cancellation.reason}
                            </Text>
                        )}

                        {order.cancellation.note && (
                            <Text className="font-sans text-sm leading-6 text-red-800">
                                Note: {order.cancellation.note}
                            </Text>
                        )}

                        <Text className="font-sans text-sm leading-6 text-red-800">
                            Cancelled by: {order.cancellation.cancelled_by}
                        </Text>

                        {order.cancellation.refunded_at && (
                            <Text className="font-sans text-sm leading-6 text-red-800">
                                Refunded: {order.cancellation.refunded_at}
                            </Text>
                        )}
                    </View>
                )}

                {!order.cancellation && order.can_cancel && (
                    <View className="gap-3 rounded-3xl border border-slate-200 bg-white p-4">
                        <Text className="font-sans-bold text-base text-slate-900">
                            Cancel order
                        </Text>

                        <Text className="font-sans text-sm leading-6 text-slate-600">
                            You can cancel this order until {order.cancel_until}
                            , as long as it is not paid.
                        </Text>

                        {cancelError && (
                            <View className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
                                <Text className="font-sans-semibold text-xs leading-5 text-red-700">
                                    {cancelError}
                                </Text>
                            </View>
                        )}

                        <Pressable
                            onPress={confirmCancel}
                            disabled={cancelling}
                            accessibilityRole="button"
                            className="flex-row items-center justify-center gap-2 rounded-full border border-red-300 bg-red-50 py-3"
                        >
                            {cancelling && (
                                <ActivityIndicator
                                    size="small"
                                    color="#dc2626"
                                />
                            )}

                            <Text className="font-sans-bold text-sm text-red-700">
                                Cancel order
                            </Text>
                        </Pressable>
                    </View>
                )}

                {!order.cancellation &&
                    !order.can_cancel &&
                    order.cancel_blocked_reason && (
                        <Text className="px-1 font-sans text-xs leading-5 text-slate-500">
                            {order.cancel_blocked_reason}
                        </Text>
                    )}
            </ScrollView>
        </View>
    );
}
