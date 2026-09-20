import { router, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    CalendarDays,
    Check,
    Minus,
    PackageOpen,
    Plus,
    ShoppingCart,
    Sparkles,
    TriangleAlert,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AvailabilityBadge from '@/components/AvailabilityBadge';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatPesos, formatPriceRange } from '@/lib/format';
import {
    findSelectedVariant,
    getActionState,
    uniqueValues,
    type AddToCartResponse,
    type ProductDetail,
    type ProductResponse,
} from '@/lib/product';

const MAX_QUANTITY = 99;

function OptionChip({
    label,
    selected,
    dimmed,
    onPress,
}: {
    label: string;
    selected: boolean;
    dimmed?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`rounded-xl border px-4 py-2.5 ${selected ? 'border-brand bg-brand' : 'border-slate-200 bg-white'}`}
        >
            <Text
                className={`font-sans-semibold text-sm ${selected ? 'text-white' : dimmed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export default function ProductPage() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { request } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [program, setProgram] = useState('');
    const [size, setSize] = useState('');
    const [quantity, setQuantity] = useState(1);

    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [added, setAdded] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);

        try {
            const response = await request<ProductResponse>(`/catalog/${id}`);

            setProduct(response.data);
        } catch (caught) {
            setLoadError(
                caught instanceof ApiError && caught.status === 404
                    ? 'This product is no longer available.'
                    : caught instanceof ApiError
                      ? caught.message
                      : 'Something went wrong. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    }, [request, id]);

    useEffect(() => {
        void load();
    }, [load]);

    const programs = useMemo(
        () =>
            product
                ? uniqueValues(product.variants.map((variant) => variant.program))
                : [],
        [product],
    );

    const sizes = useMemo(() => {
        if (!product) {
            return [];
        }

        const pool =
            product.variant_mode === 'program_and_size' && program !== ''
                ? product.variants.filter((variant) => variant.program === program)
                : product.variants;

        return uniqueValues(pool.map((variant) => variant.size));
    }, [product, program]);

    const selectedVariant = useMemo(
        () => (product ? findSelectedVariant(product, program, size) : null),
        [product, program, size],
    );

    const clearMessages = (): void => {
        setAddError(null);
        setAdded(null);
    };

    const chooseProgram = (value: string): void => {
        setProgram(value);
        setSize('');
        clearMessages();
    };

    const chooseSize = (value: string): void => {
        setSize(value);
        clearMessages();
    };

    const addToCart = async (): Promise<void> => {
        if (!selectedVariant || adding) {
            return;
        }

        setAdding(true);
        clearMessages();

        try {
            const response = await request<AddToCartResponse>('/cart/items', {
                method: 'POST',
                body: {
                    product_variant_id: selectedVariant.id,
                    quantity,
                },
            });

            setAdded(response.data.cart_total_quantity);
        } catch (caught) {
            setAddError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setAdding(false);
        }
    };

    const backButton = (
        <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="absolute left-4 h-11 w-11 items-center justify-center rounded-full bg-white/90"
            style={{ top: insets.top + 8 }}
        >
            <ArrowLeft size={22} color="#0f172a" />
        </Pressable>
    );

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-page">
                <ActivityIndicator size="large" color="#0D6EFD" />

                {backButton}
            </View>
        );
    }

    if (loadError || !product) {
        return (
            <View className="flex-1 items-center justify-center gap-4 bg-page px-8">
                <Text className="text-center font-sans-semibold text-base text-slate-700">
                    {loadError}
                </Text>

                <Pressable
                    onPress={() => void load()}
                    accessibilityRole="button"
                    className="rounded-full bg-brand px-6 py-3"
                >
                    <Text className="font-sans-bold text-sm text-white">
                        Try again
                    </Text>
                </Pressable>

                {backButton}
            </View>
        );
    }

    const action = getActionState(product, selectedVariant);
    const needsProgram = product.variant_mode === 'program_and_size';
    const needsSize = product.variant_mode !== 'standard';
    const canAdd = action === 'add_to_cart' || action === 'preorder';

    const price = selectedVariant
        ? formatPesos(selectedVariant.selling_price)
        : formatPriceRange(product.price_min, product.price_max);

    const buttonLabel = {
        add_to_cart: 'Add to Cart',
        preorder: 'Preorder Now',
        out_of_stock: 'Out of Stock',
        preorder_unavailable: 'Preorder Not Available',
        choose_options: 'Choose options first',
    }[action];

    return (
        <View className="flex-1 bg-page">
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
                keyboardShouldPersistTaps="handled"
            >
                <View>
                    {product.image_url ? (
                        <Image
                            source={{ uri: product.image_url }}
                            style={{ width, height: width }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View
                            style={{ width, height: width }}
                            className="items-center justify-center bg-slate-100"
                        >
                            <PackageOpen size={64} color="#94a3b8" />
                        </View>
                    )}

                    {backButton}
                </View>

                <View className="-mt-6 gap-5 rounded-t-3xl bg-page px-5 pt-6">
                    <View className="gap-2">
                        <View className="flex-row items-center gap-2">
                            <AvailabilityBadge
                                status={product.availability_status}
                                label={product.availability_label}
                            />

                            {product.availability_summary !==
                                product.availability_label && (
                                <View className="rounded-full bg-blue-600 px-2.5 py-1">
                                    <Text className="font-sans-bold text-[11px] text-white">
                                        {product.availability_summary}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Text className="font-sans-semibold text-xs uppercase tracking-wide text-blue-600">
                            {product.code}
                        </Text>

                        <Text className="font-sans-bold text-2xl leading-8 text-slate-900">
                            {product.name}
                        </Text>

                        <Text className="font-sans-medium text-sm text-slate-500">
                            {product.category.name}
                        </Text>

                        <Text className="mt-1 font-sans-bold text-3xl text-slate-900">
                            {price}
                        </Text>
                    </View>

                    {product.stock_urgency === 'low_stock' && (
                        <View className="flex-row items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
                            <TriangleAlert size={16} color="#c2410c" />

                            <Text className="font-sans-bold text-xs text-orange-700">
                                Only a few left
                            </Text>
                        </View>
                    )}

                    {product.early_bird && (
                        <View className="flex-row items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                            <Sparkles size={16} color="#6d28d9" />

                            <Text className="flex-1 font-sans-bold text-xs text-violet-700">
                                {product.early_bird.discount_percent}%
                                early-bird discount
                                {' - '}
                                {product.early_bird.remaining_slots} slot
                                {product.early_bird.remaining_slots === 1
                                    ? ''
                                    : 's'}{' '}
                                left
                            </Text>
                        </View>
                    )}

                    {product.expected_release_date && (
                        <View className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <CalendarDays size={18} color="#92400e" />

                            <View>
                                <Text className="font-sans-bold text-[11px] uppercase tracking-wide text-amber-800">
                                    Expected release
                                </Text>

                                <Text className="font-sans-semibold text-sm text-amber-800">
                                    {product.expected_release_date}
                                </Text>
                            </View>
                        </View>
                    )}

                    {product.description && (
                        <Text className="font-sans text-sm leading-6 text-slate-600">
                            {product.description}
                        </Text>
                    )}

                    {(needsProgram || needsSize) && (
                        <View className="gap-4 rounded-3xl border border-slate-200 bg-white p-5">
                            <Text className="font-sans-bold text-base text-slate-900">
                                Choose Product Options
                            </Text>

                            {needsProgram && (
                                <View className="gap-2">
                                    <Text className="font-sans-semibold text-xs uppercase tracking-wide text-slate-500">
                                        Program
                                    </Text>

                                    <View className="flex-row flex-wrap gap-2">
                                        {programs.map((value) => (
                                            <OptionChip
                                                key={value}
                                                label={value}
                                                selected={program === value}
                                                onPress={() => chooseProgram(value)}
                                            />
                                        ))}
                                    </View>
                                </View>
                            )}

                            {needsSize && (
                                <View className="gap-2">
                                    <Text className="font-sans-semibold text-xs uppercase tracking-wide text-slate-500">
                                        Size
                                    </Text>

                                    {needsProgram && program === '' ? (
                                        <Text className="font-sans text-sm text-slate-400">
                                            Choose a program first.
                                        </Text>
                                    ) : (
                                        <View className="flex-row flex-wrap gap-2">
                                            {sizes.map((value) => {
                                                const variant = findSelectedVariant(
                                                    product,
                                                    program,
                                                    value,
                                                );

                                                return (
                                                    <OptionChip
                                                        key={value}
                                                        label={value}
                                                        selected={size === value}
                                                        dimmed={
                                                            variant?.is_available ===
                                                            false
                                                        }
                                                        onPress={() =>
                                                            chooseSize(value)
                                                        }
                                                    />
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            )}

                            {selectedVariant && (
                                <View className="flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <Text className="font-sans-semibold text-sm text-slate-700">
                                        {selectedVariant.variant_name}
                                    </Text>

                                    <Text
                                        className={`font-sans-bold text-sm ${selectedVariant.is_available ? 'text-emerald-700' : 'text-red-600'}`}
                                    >
                                        {selectedVariant.stock_status}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View className="flex-row items-center justify-between rounded-3xl border border-slate-200 bg-white px-5 py-4">
                        <Text className="font-sans-bold text-base text-slate-900">
                            Quantity
                        </Text>

                        <View className="flex-row items-center gap-4">
                            <Pressable
                                onPress={() => {
                                    setQuantity((value) => Math.max(1, value - 1));
                                    clearMessages();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Decrease quantity"
                                className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50"
                            >
                                <Minus size={18} color="#334155" />
                            </Pressable>

                            <Text className="w-8 text-center font-sans-bold text-lg text-slate-900">
                                {quantity}
                            </Text>

                            <Pressable
                                onPress={() => {
                                    setQuantity((value) =>
                                        Math.min(MAX_QUANTITY, value + 1),
                                    );
                                    clearMessages();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Increase quantity"
                                className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50"
                            >
                                <Plus size={18} color="#334155" />
                            </Pressable>
                        </View>
                    </View>

                    {addError && (
                        <View className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                            <Text className="font-sans-semibold text-sm leading-5 text-red-700">
                                {addError}
                            </Text>
                        </View>
                    )}

                    {added !== null && (
                        <View className="flex-row items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <Check size={18} color="#047857" />

                            <View className="flex-1">
                                <Text className="font-sans-bold text-sm text-emerald-800">
                                    Added to your cart
                                </Text>

                                <Text className="font-sans text-xs text-emerald-700">
                                    {added} item{added === 1 ? '' : 's'} in your
                                    cart
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-5 pt-3"
                style={{ paddingBottom: insets.bottom + 12 }}
            >
                <Pressable
                    onPress={() => void addToCart()}
                    disabled={!canAdd || adding}
                    accessibilityRole="button"
                    className={`flex-row items-center justify-center gap-2 rounded-full py-4 ${canAdd ? 'bg-brand' : 'bg-slate-200'} ${adding ? 'opacity-60' : ''}`}
                >
                    {adding ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <ShoppingCart
                            size={18}
                            color={canAdd ? '#ffffff' : '#94a3b8'}
                        />
                    )}

                    <Text
                        className={`font-sans-bold text-base ${canAdd ? 'text-white' : 'text-slate-400'}`}
                    >
                        {adding
                            ? action === 'preorder'
                                ? 'Adding Preorder...'
                                : 'Adding to Cart...'
                            : buttonLabel}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
