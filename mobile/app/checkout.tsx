import { router, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Check,
    CircleCheck,
    PackageOpen,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PaymentMethodPicker from '@/components/PaymentMethodPicker';
import { ApiError } from '@/lib/api';
import {
    checkoutSelectionProblem,
    type CartItemData,
    type CheckoutPayload,
    type PaymentMethod,
} from '@/lib/cart';
import { useCart } from '@/lib/cart-context';
import { formatPesos } from '@/lib/format';

function SummaryRow({ item }: { item: CartItemData }) {
    return (
        <View className="flex-row gap-3">
            {item.product.image_url ? (
                <Image
                    source={{ uri: item.product.image_url }}
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
                    {item.product.name}
                </Text>

                <Text
                    numberOfLines={1}
                    className="font-sans-medium text-xs text-slate-500"
                >
                    {item.variant.variant_name} · {item.quantity} ×{' '}
                    {formatPesos(item.unit_price)}
                </Text>

                {item.item_type === 'preorder' && (
                    <Text className="font-sans-bold text-[11px] text-blue-700">
                        Preorder
                    </Text>
                )}
            </View>

            <Text className="font-sans-bold text-sm text-slate-900">
                {formatPesos(item.line_total)}
            </Text>
        </View>
    );
}

export default function Checkout() {
    const insets = useSafeAreaInsets();
    const { items: itemsParam } = useLocalSearchParams<{ items?: string }>();
    const { cart, checkout } = useCart();

    const [method, setMethod] = useState<PaymentMethod>('cash');
    const [reference, setReference] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [placed, setPlaced] = useState<{
        message: string;
        orderId: number;
        orderNumber: string;
        isPreorder: boolean;
    } | null>(null);

    const items = useMemo(() => {
        const wanted = new Set(
            (itemsParam ?? '')
                .split(',')
                .map((id) => parseInt(id, 10))
                .filter((id) => !Number.isNaN(id)),
        );

        return (cart?.items ?? []).filter((item) => wanted.has(item.id));
    }, [cart, itemsParam]);

    const selectionProblem = checkoutSelectionProblem(items);
    const isPreorderOnly =
        items.length > 0 && items.every((item) => item.item_type === 'preorder');
    const total = items.reduce((sum, item) => sum + Number(item.line_total), 0);

    const submit = async (): Promise<void> => {
        if (!isPreorderOnly && method !== 'cash' && !reference.trim()) {
            setError(
                'Enter the GCash/Maya transaction reference number before placing your order.',
            );

            return;
        }

        setSubmitting(true);
        setError(null);

        const payload: CheckoutPayload = {
            confirmed,
            item_ids: items.map((item) => item.id),
            ...(isPreorderOnly
                ? {}
                : {
                      payment_method: method,
                      payment_reference:
                          method === 'cash' ? '' : reference.trim(),
                  }),
        };

        try {
            const response = await checkout(payload);

            setPlaced({
                message: response.message,
                orderId: response.data.order.id,
                orderNumber: response.data.order.order_number,
                isPreorder: isPreorderOnly,
            });
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const header = (
        <View
            className="flex-row items-center gap-3 px-5 pb-3"
            style={{ paddingTop: insets.top + 12 }}
        >
            {!placed && (
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    hitSlop={8}
                    className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
                >
                    <ArrowLeft size={20} color="#0f172a" />
                </Pressable>
            )}

            <Text className="font-sans-bold text-2xl text-slate-900">
                Checkout
            </Text>
        </View>
    );

    if (placed) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="flex-1 items-center justify-center px-8">
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                        <CircleCheck size={32} color="#16a34a" />
                    </View>

                    <Text className="mt-5 font-sans-bold text-xl text-slate-900">
                        {placed.isPreorder
                            ? 'Preorder submitted'
                            : 'Order placed'}
                    </Text>

                    <Text className="mt-1 font-sans-semibold text-sm text-slate-500">
                        {placed.orderNumber}
                    </Text>

                    <Text className="mt-3 text-center font-sans text-sm leading-6 text-slate-600">
                        {placed.message}
                    </Text>

                    <Pressable
                        onPress={() => {
                            // Home underneath, so Back from the order page lands there.
                            router.replace('/');
                            router.push(`/order/${placed.orderId}`);
                        }}
                        accessibilityRole="button"
                        className="mt-8 rounded-full bg-brand px-8 py-3"
                    >
                        <Text className="font-sans-bold text-sm text-white">
                            View my order
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => router.replace('/')}
                        accessibilityRole="button"
                        className="mt-3 rounded-full px-8 py-3"
                    >
                        <Text className="font-sans-bold text-sm text-brand">
                            Back to Home
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    if (selectionProblem) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="items-center gap-4 px-8 pt-10">
                    <Text className="text-center font-sans-semibold text-sm leading-6 text-red-700">
                        {selectionProblem}
                    </Text>

                    <Pressable
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        className="rounded-full bg-brand px-6 py-3"
                    >
                        <Text className="font-sans-bold text-sm text-white">
                            Back to cart
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const canSubmit = confirmed && !submitting;

    return (
        <View className="flex-1 bg-page">
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
                        Order summary
                    </Text>

                    {items.map((item) => (
                        <SummaryRow key={item.id} item={item} />
                    ))}

                    <View className="flex-row items-center justify-between border-t border-slate-100 pt-3">
                        <Text className="font-sans-medium text-sm text-slate-500">
                            Total
                        </Text>

                        <Text className="font-sans-bold text-lg text-slate-900">
                            {formatPesos(total)}
                        </Text>
                    </View>
                </View>

                {isPreorderOnly ? (
                    <View className="rounded-3xl border border-blue-200 bg-blue-50 p-4">
                        <Text className="font-sans-bold text-sm text-blue-800">
                            No payment is required yet
                        </Text>

                        <Text className="mt-1 font-sans text-sm leading-6 text-blue-800">
                            Your final preorder price, including any eligible
                            early-bird discount, is confirmed when the preorder
                            is submitted. You will be notified when it is ready
                            for payment.
                        </Text>
                    </View>
                ) : (
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
                        total={total}
                        disabled={submitting}
                    />
                )}

                <Pressable
                    onPress={() => setConfirmed((current) => !current)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: confirmed }}
                    className="flex-row items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4"
                >
                    <View
                        className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border ${confirmed ? 'border-brand bg-brand' : 'border-slate-300 bg-white'}`}
                    >
                        {confirmed && <Check size={16} color="#ffffff" />}
                    </View>

                    <Text className="flex-1 font-sans text-sm leading-6 text-slate-700">
                        {isPreorderOnly
                            ? 'I confirm that I reviewed the preorder items and total amount.'
                            : 'I confirm that I reviewed the selected products, variants, quantities, and total amount.'}
                    </Text>
                </Pressable>

                {error && (
                    <View className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
                        <Text className="font-sans-semibold text-xs leading-5 text-red-700">
                            {error}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View
                className="gap-3 border-t border-slate-200 bg-white px-5 pt-3"
                style={{ paddingBottom: insets.bottom + 12 }}
            >
                <View className="flex-row items-center justify-between">
                    <Text className="font-sans-medium text-sm text-slate-500">
                        Total
                    </Text>

                    <Text className="font-sans-bold text-xl text-slate-900">
                        {formatPesos(total)}
                    </Text>
                </View>

                <Pressable
                    onPress={() => void submit()}
                    disabled={!canSubmit}
                    accessibilityRole="button"
                    className={`flex-row items-center justify-center gap-2 rounded-full py-4 ${canSubmit ? 'bg-brand' : 'bg-slate-200'}`}
                >
                    {submitting && (
                        <ActivityIndicator size="small" color="#ffffff" />
                    )}

                    <Text
                        className={`font-sans-bold text-base ${canSubmit ? 'text-white' : 'text-slate-400'}`}
                    >
                        {isPreorderOnly ? 'Submit preorder' : 'Place order'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
