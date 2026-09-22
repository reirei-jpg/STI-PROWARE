import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, PackageOpen } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PaymentMethodPicker from '@/components/PaymentMethodPicker';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { PaymentMethod } from '@/lib/cart';
import { formatPesos } from '@/lib/format';
import type {
    OrderChangeResponse,
    OrderDetail,
    OrderResponse,
} from '@/lib/orders';

/** Paying for a preorder whose stock has arrived: pick cash, GCash or Maya. */
export default function PayPreorder() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { request } = useAuth();

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [method, setMethod] = useState<PaymentMethod>('cash');
    const [reference, setReference] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const response = await request<OrderResponse>(`/orders/${id}`);

            setOrder(response.data);
            setLoadError(null);
        } catch (caught) {
            setLoadError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        }
    }, [request, id]);

    useEffect(() => {
        void load();
    }, [load]);

    const submit = async (): Promise<void> => {
        if (method !== 'cash' && !reference.trim()) {
            setError(
                'Enter the GCash/Maya transaction reference number before submitting.',
            );

            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await request<OrderChangeResponse>(
                `/orders/${id}/payment`,
                {
                    method: 'POST',
                    body: {
                        payment_method: method,
                        payment_reference:
                            method === 'cash' ? '' : reference.trim(),
                    },
                },
            );

            // Continue on the order page, which now shows the Payment QR.
            router.replace({
                pathname: '/order/[id]',
                params: { id, notice: response.message },
            });
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
            setSubmitting(false);
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

            <Text className="font-sans-bold text-2xl text-slate-900">
                Pay for Preorder
            </Text>
        </View>
    );

    if (!order) {
        return (
            <View className="flex-1 bg-page">
                {header}

                {loadError ? (
                    <View className="items-center gap-3 px-8 pt-10">
                        <Text className="text-center font-sans-semibold text-sm text-red-700">
                            {loadError}
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

    if (!order.payment_method_needed) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="items-center gap-4 px-8 pt-10">
                    <Text className="text-center font-sans-semibold text-sm leading-6 text-red-700">
                        This preorder is not currently awaiting a payment
                        method.
                    </Text>

                    <Pressable
                        onPress={() => router.replace(`/order/${id}`)}
                        accessibilityRole="button"
                        className="rounded-full bg-brand px-6 py-3"
                    >
                        <Text className="font-sans-bold text-sm text-white">
                            View order
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const readyItems = order.items.filter(
        (item) => item.preorder_status === 'ready',
    );

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-page"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {header}

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: 24,
                    gap: 16,
                }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="gap-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <Text className="font-sans-bold text-base text-slate-900">
                        {order.order_number}
                    </Text>

                    {readyItems.map((item) => (
                        <View key={item.id} className="flex-row gap-3">
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

                                {item.preorder_payment_deadline_at && (
                                    <Text className="font-sans-semibold text-[11px] text-emerald-700">
                                        Pay by{' '}
                                        {item.preorder_payment_deadline_at}
                                    </Text>
                                )}
                            </View>

                            <Text className="font-sans-bold text-sm text-slate-900">
                                {formatPesos(item.line_total)}
                            </Text>
                        </View>
                    ))}

                    <View className="flex-row items-center justify-between border-t border-slate-100 pt-3">
                        <Text className="font-sans-medium text-sm text-slate-500">
                            Amount due
                        </Text>

                        <Text className="font-sans-bold text-lg text-slate-900">
                            {formatPesos(order.payment_due_total)}
                        </Text>
                    </View>
                </View>

                <PaymentMethodPicker
                    method={method}
                    onMethodChange={(next) => {
                        setMethod(next);
                        setError(null);

                        if (next === 'cash') {
                            setReference('');
                        }
                    }}
                    reference={reference}
                    onReferenceChange={(text) => {
                        setReference(text);
                        setError(null);
                    }}
                    total={order.payment_due_total}
                    disabled={submitting}
                />

                {error && (
                    <View className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
                        <Text className="font-sans-semibold text-xs leading-5 text-red-700">
                            {error}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View
                className="border-t border-slate-200 bg-white px-5 pt-3"
                style={{ paddingBottom: insets.bottom + 12 }}
            >
                <Pressable
                    onPress={() => void submit()}
                    disabled={submitting}
                    accessibilityRole="button"
                    className={`flex-row items-center justify-center gap-2 rounded-full py-4 ${submitting ? 'bg-slate-200' : 'bg-brand'}`}
                >
                    {submitting && (
                        <ActivityIndicator size="small" color="#ffffff" />
                    )}

                    <Text
                        className={`font-sans-bold text-base ${submitting ? 'text-slate-400' : 'text-white'}`}
                    >
                        Submit payment method
                    </Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}
