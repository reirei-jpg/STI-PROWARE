import { CalendarDays, PackageOpen, Sparkles } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';

import AvailabilityBadge from '@/components/AvailabilityBadge';
import type { CatalogProduct } from '@/lib/catalog';
import { formatPriceRange } from '@/lib/format';

/** A wider card for the Coming Soon carousel. */
export default function ComingSoonCard({
    product,
    width,
}: {
    product: CatalogProduct;
    width: number;
}) {
    return (
        <View
            style={{ width }}
            className="overflow-hidden rounded-3xl border border-slate-100 bg-white"
        >
            <View>
                {product.image_url ? (
                    <Image
                        source={{ uri: product.image_url }}
                        style={{ width, height: 150 }}
                        resizeMode="cover"
                    />
                ) : (
                    <View
                        style={{ width, height: 150 }}
                        className="items-center justify-center bg-slate-100"
                    >
                        <PackageOpen size={36} color="#94a3b8" />
                    </View>
                )}

                <View className="absolute left-2.5 top-2.5">
                    <AvailabilityBadge
                        status={product.availability_status}
                        label={product.availability_label}
                    />
                </View>

                {product.accepts_preorders && (
                    <View className="absolute right-2.5 top-2.5 rounded-full bg-blue-600 px-2.5 py-1">
                        <Text className="font-sans-bold text-[11px] text-white">
                            Preorder Available
                        </Text>
                    </View>
                )}
            </View>

            <View className="gap-1.5 p-3">
                <Text
                    numberOfLines={2}
                    className="font-sans-bold text-sm leading-5 text-slate-900"
                >
                    {product.name}
                </Text>

                <Text className="font-sans-bold text-base text-slate-900">
                    {formatPriceRange(product.price_min, product.price_max)}
                </Text>

                {product.expected_release_date && (
                    <View className="flex-row items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                        <CalendarDays size={13} color="#92400e" />

                        <Text className="flex-1 font-sans-semibold text-[11px] text-amber-800">
                            Expected release: {product.expected_release_date}
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
            </View>
        </View>
    );
}
