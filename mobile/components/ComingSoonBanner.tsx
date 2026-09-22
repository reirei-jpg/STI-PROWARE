import { CalendarDays, Megaphone, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from 'react-native';

import { badgeIsActive, type CatalogProduct } from '@/lib/catalog';

/** Compact, like the website's strip: the photo on the left, the blue panel on the right. */
const CARD_HEIGHT = 232;

/** The photo takes about 38% of the width, like the website. */
const IMAGE_SHARE = 0.38;

/** Same rhythm as the website: a new item every 5 seconds. */
const ROTATE_EVERY_MS = 5000;

/**
 * The website's Coming Soon promotion, made for a phone: a compact strip that
 * shows one upcoming item at a time. It turns to the next item every 5
 * seconds (and back to the first after the last), can be swiped, and has dots.
 * Every slide is the same size.
 */
export default function ComingSoonBanner({
    products,
    width,
    onOpen,
}: {
    products: CatalogProduct[];
    width: number;
    onOpen: (product: CatalogProduct) => void;
}) {
    const scroller = useRef<ScrollView>(null);
    const [index, setIndex] = useState(0);

    // While a finger is on the banner it does not slide, so a slide can never
    // change under the finger and cause a wrong tap. It carries on after the
    // finger is lifted.
    const [isTouching, setIsTouching] = useState(false);

    const count = products.length;
    const imageWidth = Math.round(width * IMAGE_SHARE);

    const goTo = (target: number): void => {
        const next = ((target % count) + count) % count;

        setIndex(next);
        scroller.current?.scrollTo({ x: next * width, animated: true });
    };

    // Keep the position valid if the list gets shorter.
    useEffect(() => {
        if (index >= count) {
            setIndex(0);
            scroller.current?.scrollTo({ x: 0, animated: false });
        }
    }, [index, count]);

    // Turn to the next item after 5 seconds (counted again from the moment a
    // finger is lifted), except while the banner is being touched.
    useEffect(() => {
        if (isTouching || count <= 1) {
            return;
        }

        const timer = setTimeout(() => goTo(index + 1), ROTATE_EVERY_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTouching, index, count, width]);

    const onSwipeEnd = (
        event: NativeSyntheticEvent<NativeScrollEvent>,
    ): void => {
        setIndex(
            Math.min(
                count - 1,
                Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width)),
            ),
        );
    };

    if (count === 0) {
        return null;
    }

    return (
        <View
            style={{ width, height: CARD_HEIGHT }}
            onTouchStart={() => setIsTouching(true)}
            onTouchEnd={() => setIsTouching(false)}
            onTouchCancel={() => setIsTouching(false)}
            className="overflow-hidden rounded-3xl border border-blue-100 bg-white"
        >
            <ScrollView
                ref={scroller}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onSwipeEnd}
                scrollEnabled={count > 1}
            >
                {products.map((product) => {
                    const isNew = badgeIsActive(
                        product.new_badge_started_at,
                        product.new_badge_duration_days,
                    );

                    return (
                        <Pressable
                            key={product.id}
                            onPress={() => onOpen(product)}
                            accessibilityRole="button"
                            accessibilityLabel={product.name}
                            style={{ width, height: CARD_HEIGHT }}
                            className="flex-row"
                        >
                            <View
                                style={{ width: imageWidth, height: CARD_HEIGHT }}
                                className="bg-slate-100"
                            >
                                {product.image_url ? (
                                    <Image
                                        source={{ uri: product.image_url }}
                                        style={{
                                            width: imageWidth - 16,
                                            height: CARD_HEIGHT - 16,
                                            margin: 8,
                                        }}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View className="flex-1 items-center justify-center bg-blue-50">
                                        <Megaphone size={36} color="#3b82f6" />
                                    </View>
                                )}

                                <View className="absolute left-2 top-2 rounded-full bg-amber-400 px-2.5 py-1">
                                    <Text className="font-sans-bold text-[9px] uppercase tracking-wide text-slate-900">
                                        Coming Soon
                                    </Text>
                                </View>

                                {isNew && (
                                    <View className="absolute bottom-2 left-2 rounded-full bg-emerald-600 px-2.5 py-1">
                                        <Text className="font-sans-bold text-[9px] uppercase tracking-wide text-white">
                                            New
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View
                                style={{ width: width - imageWidth, height: CARD_HEIGHT }}
                                className="justify-center gap-1.5 overflow-hidden bg-blue-700 px-3.5 pb-8 pt-3.5"
                            >
                                <Text className="font-sans-bold text-[9px] uppercase tracking-[1.5px] text-yellow-300">
                                    Upcoming Merchandise
                                </Text>

                                <Text
                                    numberOfLines={2}
                                    className="font-sans-bold text-lg leading-6 text-white"
                                >
                                    {product.name}
                                </Text>

                                <Text
                                    numberOfLines={2}
                                    className="font-sans text-xs leading-4 text-blue-100"
                                >
                                    {product.description ??
                                        'A new STI merchandise item is coming soon.'}
                                </Text>

                                <View className="flex-row flex-wrap items-center gap-1.5">
                                    {product.accepts_preorders && (
                                        <View className="rounded-full bg-yellow-400 px-2 py-1">
                                            <Text className="font-sans-bold text-[10px] text-slate-900">
                                                Preorder Available
                                            </Text>
                                        </View>
                                    )}

                                    {product.early_bird && (
                                        <View className="flex-row items-center gap-1 rounded-full bg-violet-500 px-2 py-1">
                                            <Sparkles size={10} color="#ffffff" />

                                            <Text className="font-sans-bold text-[10px] text-white">
                                                {product.early_bird.discount_percent}
                                                % off ·{' '}
                                                {product.early_bird.remaining_slots}{' '}
                                                left
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {product.expected_release_date && (
                                    <View className="flex-row items-center gap-1.5">
                                        <CalendarDays size={12} color="#dbeafe" />

                                        <Text
                                            numberOfLines={1}
                                            className="flex-1 font-sans-semibold text-[11px] text-blue-100"
                                        >
                                            Expected release:{' '}
                                            {product.expected_release_date}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {count > 1 && (
                <View
                    style={{ bottom: 10, left: 0, right: 0 }}
                    className="absolute flex-row items-center justify-center"
                    pointerEvents="none"
                >
                    <View className="flex-row items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1.5">
                        {products.map((product, position) => (
                            <View
                                key={product.id}
                                className={`h-1.5 rounded-full ${position === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                            />
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}
