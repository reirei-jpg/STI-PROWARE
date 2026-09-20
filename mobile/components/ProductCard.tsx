import { Ban, PackageOpen, Sparkles, TriangleAlert } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';

import AvailabilityBadge from '@/components/AvailabilityBadge';
import { badgeIsActive, type CatalogProduct } from '@/lib/catalog';
import { formatPriceRange } from '@/lib/format';

/** Every card has the same text area height, so a row of cards is always even. */
const TEXT_AREA_HEIGHT = 196;

/** The height of a card of this width, for lists that want to know it. */
export function productCardHeight(width: number): number {
    return width + TEXT_AREA_HEIGHT;
}

/**
 * One product in the grid, with the same information and rules as the
 * website's product card (badges, low stock, early bird).
 *
 * All cards are exactly the same size: the name always takes two lines of
 * room, and one fixed slot shows the most important notice.
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

    const showsSummary =
        product.availability_summary !== product.availability_label;

    return (
        <View
            style={{ width, height: productCardHeight(width) }}
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
                        <PackageOpen size={40} color="#94a3b8" />
                    </View>
                )}

                {isOutOfStock && (
                    <View className="absolute inset-0 items-center justify-center bg-slate-900/30">
                        <View className="flex-row items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
                            <Ban size={14} color="#1e293b" />

                            <Text className="font-sans-bold text-xs text-slate-800">
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

            <View
                style={{ height: TEXT_AREA_HEIGHT }}
                className="gap-1.5 overflow-hidden p-3.5"
            >
                <Text
                    numberOfLines={1}
                    className="font-sans-semibold text-[11px] uppercase tracking-wide text-blue-600"
                >
                    {product.code}
                </Text>

                {/* Always two lines of room, so one-line and two-line names line up. */}
                <View style={{ height: 40 }}>
                    <Text
                        numberOfLines={2}
                        className="font-sans-bold text-[15px] leading-5 text-slate-900"
                    >
                        {product.name}
                    </Text>
                </View>

                <Text
                    numberOfLines={1}
                    className="font-sans-medium text-[13px] text-slate-500"
                >
                    {product.category.name}
                </Text>

                <Text
                    numberOfLines={1}
                    className="font-sans-bold text-lg leading-6 text-slate-900"
                >
                    {formatPriceRange(product.price_min, product.price_max)}
                </Text>

                {/* One fixed slot for the most important notice. */}
                <View style={{ height: 26 }} className="justify-center">
                    {product.stock_urgency === 'low_stock' ? (
                        <View className="flex-row items-center gap-1.5 self-start rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1">
                            <TriangleAlert size={13} color="#c2410c" />

                            <Text className="font-sans-bold text-[11px] text-orange-700">
                                Only a few left
                            </Text>
                        </View>
                    ) : product.early_bird ? (
                        <View className="flex-row items-center gap-1.5 self-start rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1">
                            <Sparkles size={13} color="#6d28d9" />

                            <Text
                                numberOfLines={1}
                                className="font-sans-bold text-[11px] text-violet-700"
                            >
                                {product.early_bird.discount_percent}% early bird
                                {' - '}
                                {product.early_bird.remaining_slots} left
                            </Text>
                        </View>
                    ) : null}
                </View>

                <Text
                    numberOfLines={1}
                    className={`text-xs ${showsSummary ? 'font-sans-semibold text-slate-600' : 'font-sans-medium text-slate-400'}`}
                >
                    {showsSummary
                        ? product.availability_summary
                        : `${product.variants_count} ${
                              product.variants_count === 1
                                  ? 'variant'
                                  : 'variants'
                          }`}
                </Text>
            </View>
        </View>
    );
}
