import { router } from 'expo-router';
import {
    Check,
    Minus,
    PackageOpen,
    Plus,
    ShoppingCart,
    Trash2,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';
import {
    checkoutSelectionProblem,
    quantityProblem,
    type CartItemData,
} from '@/lib/cart';
import { useCart } from '@/lib/cart-context';
import { formatPesos } from '@/lib/format';

function CartRow({
    item,
    selected,
    onToggle,
}: {
    item: CartItemData;
    selected: boolean;
    onToggle: () => void;
}) {
    const { updateQuantity, removeItem } = useCart();

    const [input, setInput] = useState(String(item.quantity));
    const [busy, setBusy] = useState(false);
    const [serverMessage, setServerMessage] = useState<string | null>(null);

    // Follow the cart when the server confirms a change.
    useEffect(() => {
        setInput(String(item.quantity));
    }, [item.quantity]);

    const problem = quantityProblem(input);

    const run = async (action: () => Promise<void>): Promise<void> => {
        setBusy(true);
        setServerMessage(null);

        try {
            await action();
        } catch (caught) {
            setServerMessage(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setBusy(false);
        }
    };

    const change = (next: number): void => {
        if (next < 1 || next > 99 || next === item.quantity) {
            return;
        }

        void run(() => updateQuantity(item.id, next));
    };

    // A typed number is applied when the student finishes; a wrong one shows
    // its message and nothing is sent or rewritten.
    const commit = (): void => {
        if (problem === null) {
            change(parseInt(input, 10));
        }
    };

    const confirmRemove = (): void => {
        Alert.alert(
            'Remove item',
            `Remove ${item.product.name} from your cart?`,
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => void run(() => removeItem(item.id)),
                },
            ],
        );
    };

    const base = problem === null ? parseInt(input, 10) : item.quantity;

    return (
        <View className="gap-3 rounded-3xl border border-slate-200 bg-white p-4">
            <View className="flex-row gap-3">
                <Pressable
                    onPress={onToggle}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    hitSlop={8}
                    className="pt-1"
                >
                    <View
                        className={`h-6 w-6 items-center justify-center rounded-md border ${selected ? 'border-brand bg-brand' : 'border-slate-300 bg-white'}`}
                    >
                        {selected && <Check size={16} color="#ffffff" />}
                    </View>
                </Pressable>

                {item.product.image_url ? (
                    <Image
                        source={{ uri: item.product.image_url }}
                        className="h-20 w-20 rounded-2xl"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
                        <PackageOpen size={26} color="#94a3b8" />
                    </View>
                )}

                <View className="flex-1 gap-1">
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
                        {item.variant.variant_name}
                    </Text>

                    <View className="flex-row items-center gap-2">
                        <Text className="font-sans-semibold text-sm text-slate-700">
                            {formatPesos(item.unit_price)}
                        </Text>

                        {item.item_type === 'preorder' && (
                            <View className="rounded-full bg-blue-100 px-2 py-0.5">
                                <Text className="font-sans-bold text-[10px] text-blue-700">
                                    Preorder
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <Pressable
                    onPress={confirmRemove}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.product.name}`}
                    hitSlop={8}
                    className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
                >
                    <Trash2 size={17} color="#dc2626" />
                </Pressable>
            </View>

            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                    <Pressable
                        onPress={() => change(base - 1)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel="Decrease quantity"
                        className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50"
                    >
                        <Minus size={16} color="#334155" />
                    </Pressable>

                    <TextInput
                        value={input}
                        onChangeText={(text) => {
                            setInput(text.replace(/[^0-9]/g, ''));
                            setServerMessage(null);
                        }}
                        onEndEditing={commit}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                        editable={!busy}
                        accessibilityLabel="Quantity"
                        className={`w-14 rounded-xl border bg-white py-2 text-center font-sans-bold text-base text-slate-900 ${problem ? 'border-red-400' : 'border-slate-200'}`}
                    />

                    <Pressable
                        onPress={() => change(base + 1)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel="Increase quantity"
                        className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50"
                    >
                        <Plus size={16} color="#334155" />
                    </Pressable>

                    {busy && <ActivityIndicator size="small" color="#0D6EFD" />}
                </View>

                <Text className="font-sans-bold text-base text-slate-900">
                    {formatPesos(item.line_total)}
                </Text>
            </View>

            {(problem || serverMessage) && (
                <View className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
                    <Text className="font-sans-semibold text-xs leading-5 text-red-700">
                        {problem ?? serverMessage}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function Cart() {
    const insets = useSafeAreaInsets();
    const { cart, loading, error, refresh } = useCart();

    // Everything is ticked by default; the student unticks what to leave out.
    const [deselected, setDeselected] = useState<Set<number>>(new Set());
    const [refreshing, setRefreshing] = useState(false);

    // Shown only after the student taps Checkout, so it never nags earlier.
    const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

    const items = cart?.items ?? [];
    const selectedItems = items.filter((item) => !deselected.has(item.id));
    const selectedTotal = selectedItems.reduce(
        (sum, item) => sum + Number(item.line_total),
        0,
    );

    const toggle = (id: number): void => {
        setCheckoutMessage(null);

        setDeselected((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    const allSelected = items.length > 0 && selectedItems.length === items.length;

    const goToCheckout = (): void => {
        const problem = checkoutSelectionProblem(selectedItems);

        setCheckoutMessage(problem);

        if (problem === null) {
            router.push({
                pathname: '/checkout',
                params: { items: selectedItems.map((item) => item.id).join(',') },
            });
        }
    };

    const pullToRefresh = async (): Promise<void> => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    const header = (
        <View
            className="px-5 pb-3"
            style={{ paddingTop: insets.top + 12 }}
        >
            <Text className="font-sans-bold text-2xl text-slate-900">
                My Cart
            </Text>

            <Text className="font-sans text-sm text-slate-500">
                {cart && cart.total_quantity > 0
                    ? `${cart.total_quantity} item${cart.total_quantity === 1 ? '' : 's'} in your cart`
                    : 'Choose merchandise to check out'}
            </Text>
        </View>
    );

    if (loading && !cart) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0D6EFD" />
                </View>
            </View>
        );
    }

    if (error && !cart) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="items-center gap-3 px-8 pt-10">
                    <Text className="text-center font-sans-semibold text-sm text-red-700">
                        {error}
                    </Text>

                    <Pressable
                        onPress={() => void refresh()}
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
                        <ShoppingCart size={30} color="#0D6EFD" />
                    </View>

                    <Text className="mt-5 font-sans-bold text-xl text-slate-900">
                        Your cart is empty
                    </Text>

                    <Text className="mt-2 text-center font-sans text-sm leading-6 text-slate-500">
                        Add merchandise from the Home tab and it will appear
                        here.
                    </Text>

                    <Pressable
                        onPress={() => router.navigate('/')}
                        accessibilityRole="button"
                        className="mt-6 rounded-full bg-brand px-6 py-3"
                    >
                        <Text className="font-sans-bold text-sm text-white">
                            Browse merchandise
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-page">
            {header}

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => void pullToRefresh()}
                    />
                }
            >
                <Pressable
                    onPress={() => {
                        setCheckoutMessage(null);
                        setDeselected(
                            allSelected
                                ? new Set(items.map((item) => item.id))
                                : new Set(),
                        );
                    }}
                    accessibilityRole="button"
                    className="self-start rounded-full border border-slate-200 bg-white px-4 py-2"
                >
                    <Text className="font-sans-semibold text-sm text-slate-700">
                        {allSelected ? 'Deselect all' : 'Select all'}
                    </Text>
                </Pressable>

                {items.map((item) => (
                    <CartRow
                        key={item.id}
                        item={item}
                        selected={!deselected.has(item.id)}
                        onToggle={() => toggle(item.id)}
                    />
                ))}
            </ScrollView>

            <View className="gap-3 border-t border-slate-200 bg-white px-5 pb-4 pt-3">
                <View className="flex-row items-center justify-between">
                    <Text className="font-sans-medium text-sm text-slate-500">
                        {selectedItems.length} of {items.length} selected
                    </Text>

                    <Text className="font-sans-bold text-xl text-slate-900">
                        {formatPesos(selectedTotal)}
                    </Text>
                </View>

                {checkoutMessage && (
                    <View className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
                        <Text className="font-sans-semibold text-xs leading-5 text-red-700">
                            {checkoutMessage}
                        </Text>
                    </View>
                )}

                <Pressable
                    onPress={goToCheckout}
                    accessibilityRole="button"
                    className="items-center rounded-full bg-brand py-4"
                >
                    <Text className="font-sans-bold text-base text-white">
                        Checkout
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
