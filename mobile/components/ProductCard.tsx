import { Ban, PackageOpen, Sparkles, TriangleAlert } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';

import AvailabilityBadge from '@/components/AvailabilityBadge';
import { badgeIsActive, type CatalogProduct } from '@/lib/catalog';
import { formatPriceRange } from '@/lib/format';

/**
 * One product in the grid, with the same information and rules as the
 * website's product card (badges, low stock, early bird).
 */
export default function ProductCard({
    product,
    width,
}: {
    product: CatalogProduct;
    width: number;
}) {
    const isOutOfStock = product.availability_status === 'out_of_stock';

    const showPreorderBadge =
        product.availability_status === 'coming_soon' &&
        product.accepts_preorders;

    const showNewBadge = badgeIsActive(
        product.new_badge_started_at,
        product.new_badge_duration_days,
    );

    const showRestockedBadge = badgeIsActive(
        product.restocked_badge_started_at,
        product.restocked_badge_duration_days,
    );

    return (
        <View
            style={{ width }}
            className="overflow-hidden rounded-3xl border border-slate-100 bg-white"
        >
            <View>
                {product.image_url ? (
                    <Image
                        source={{ uri: product.image_url }}
                        style={{ width, height: width }}
                        resizeMode="cover"
                        className={isOutOfStock ? 'opacity-50' : ''}
                    />
                ) : (
                    <View
                        style={{ width, height: width }}
                        className="items-center justify-center bg-slate-100"
                    >
                        <PackageOpen size={36} color="#94a3b8" />
                    </View>
                )}

                {isOutOfStock && (
                    <View className="absolute inset-0 items-center justify-center bg-slate-900/30">
                        <View className="flex-row items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                            <Ban size={13} color="#1e293b" />

                            <Text className="font-sans-bold text-[11px] text-slate-800">
                                Unavailable
                            </Text>
                        </View>
                    </View>
                )}

                <View className="absolute left-2.5 top-2.5">
                    <AvailabilityBadge
                        status={product.availability_status}
                        label={product.availability_label}
                    />
                </View>

                {showPreorderBadge && (
                    <View className="absolute right-2.5 top-2.5 rounded-full bg-blue-600 px-2.5 py-1">
                        <Text className="font-sans-bold text-[11px] text-white">
                            Preorder
                        </Text>
                    </View>
                )}

                {showNewBadge && (
                    <View className="absolute bottom-2.5 left-2.5 rounded-full bg-emerald-600 px-2.5 py-1">
                        <Text className="font-sans-bold text-[10px] uppercase text-white">
                            New
                        </Text>
                    </View>
                )}

                {showRestockedBadge && (
                    <View className="absolute bottom-2.5 right-2.5 rounded-full bg-violet-600 px-2.5 py-1">
                        <Text className="font-sans-bold text-[10px] uppercase text-white">
                            Restocked
                        </Text>
                    </View>
                )}
            </View>

            <View className="gap-1.5 p-3">
                <Text
                    numberOfLines={1}
                    className="font-sans-semibold text-[10px] uppercase tracking-wide text-blue-600"
                >
                    {product.code}
                </Text>

                <Text
                    numberOfLines={2}
                    className="font-sans-bold text-sm leading-5 text-slate-900"
                >
                    {product.name}
                </Text>

                <Text
                    numberOfLines={1}
                    className="font-sans-medium text-xs text-slate-500"
                >
                    {product.category.name}
                </Text>

                <Text className="mt-1 font-sans-bold text-base text-slate-900">
                    {formatPriceRange(product.price_min, product.price_max)}
                </Text>

                {product.availability_summary !== product.availability_label && (
                    <Text className="font-sans-semibold text-xs text-slate-600">
                        {product.availability_summary}
                    </Text>
                )}

                {product.stock_urgency === 'low_stock' && (
                    <View className="flex-row items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1.5">
                        <TriangleAlert size={13} color="#c2410c" />

                        <Text className="font-sans-bold text-[11px] text-orange-700">
                            Only a few left
                        </Text>
                    </View>
                )}

                {product.early_bird && (
                    <View className="flex-row items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1.5">
                        <Sparkles size={13} color="#6d28d9" />

                        <Text className="flex-1 font-sans-bold text-[11px] text-violet-700">
                            {product.early_bird.discount_percent}% early bird
                            {' - '}
                            {product.early_bird.remaining_slots} slot
                            {product.early_bird.remaining_slots === 1
                                ? ''
                                : 's'}{' '}
                            left
                        </Text>
                    </View>
                )}

                <Text className="font-sans-medium text-[11px] text-slate-400">
                    {product.variants_count}{' '}
                    {product.variants_count === 1 ? 'variant' : 'variants'}
                </Text>
            </View>
        </View>
    );
}
