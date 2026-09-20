import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Megaphone,
    Sparkles,
} from 'lucide-react-native';
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

const IMAGE_HEIGHT = 210;

/** Every slide has the same text panel height, so the banner never changes size. */
const PANEL_HEIGHT = 318;

/** Same rhythm as the website: a new item every 5 seconds. */
const ROTATE_EVERY_MS = 5000;

/**
 * The website's Coming Soon promotion, made for a phone: one full-width
 * banner at a time with the product photo above a blue panel. It turns to the
 * next upcoming item every 5 seconds (and back to the first after the last),
 * can be swiped, and has arrows and dots like the website.
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

    const count = products.length;

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

    // Turn to the next item after 5 seconds. The wait starts over after every
    // change, so a swipe or an arrow tap is never undone straight away.
    useEffect(() => {
        if (count <= 1) {
            return;
        }

        const timer = setTimeout(() => goTo(index + 1), ROTATE_EVERY_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, count, width]);

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
            style={{ width }}
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
                            style={{ width }}
                        >
                            <View
                                style={{ width, height: IMAGE_HEIGHT }}
                                className="bg-slate-100"
                            >
                                {product.image_url ? (
                                    <Image
                                        source={{ uri: product.image_url }}
                                        style={{
                                            width: width - 32,
                                            height: IMAGE_HEIGHT - 32,
                                            margin: 16,
                                        }}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View className="flex-1 items-center justify-center bg-blue-50">
                                        <Megaphone size={52} color="#3b82f6" />
                                    </View>
                                )}

                                <View className="absolute left-3.5 top-3.5 rounded-full bg-amber-400 px-3.5 py-1.5">
                                    <Text className="font-sans-bold text-[11px] uppercase tracking-wide text-slate-900">
                                        Coming Soon
                                    </Text>
                                </View>

                                {isNew && (
                                    <View className="absolute bottom-3.5 left-3.5 rounded-full bg-emerald-600 px-3.5 py-1.5">
                                        <Text className="font-sans-bold text-[11px] uppercase tracking-wide text-white">
                                            New
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View
                                style={{ height: PANEL_HEIGHT }}
                                className="gap-3 overflow-hidden bg-blue-700 px-5 pt-5"
                            >
                                <View className="gap-1.5">
                                    <Text className="font-sans-bold text-[11px] uppercase tracking-[2px] text-yellow-300">
                                        Upcoming Merchandise
                                    </Text>

                                    <Text
                                        numberOfLines={2}
                                        className="font-sans-bold text-2xl leading-8 text-white"
                                    >
                                        {product.name}
                                    </Text>

                                    <Text
                                        numberOfLines={2}
                                        className="font-sans text-sm leading-6 text-blue-100"
                                    >
                                        {product.description ??
                                            'A new STI merchandise item is coming soon.'}
                                    </Text>
                                </View>

                                <View className="flex-row flex-wrap items-center gap-2">
                                    {product.accepts_preorders && (
                                        <View className="rounded-full bg-yellow-400 px-3 py-1.5">
                                            <Text className="font-sans-bold text-xs text-slate-900">
                                                Preorder Available
                                            </Text>
                                        </View>
                                    )}

                                    {product.early_bird && (
                                        <View className="flex-row items-center gap-1.5 rounded-full bg-violet-500 px-3 py-1.5">
                                            <Sparkles size={13} color="#ffffff" />

                                            <Text className="font-sans-bold text-xs text-white">
                                                {product.early_bird.discount_percent}
                                                % off ·{' '}
                                                {product.early_bird.remaining_slots}{' '}
                                                slot
                                                {product.early_bird
                                                    .remaining_slots === 1
                                                    ? ''
                                                    : 's'}{' '}
                                                left
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {product.expected_release_date && (
                                    <View className="flex-row items-center gap-2">
                                        <CalendarDays size={16} color="#dbeafe" />

                                        <Text className="font-sans-semibold text-sm text-blue-100">
                                            Expected release:{' '}
                                            {product.expected_release_date}
                                        </Text>
                                    </View>
                                )}

                                <View className="mt-1 self-start rounded-xl bg-white px-5 py-2.5">
                                    <Text className="font-sans-bold text-sm text-blue-700">
                                        {product.accepts_preorders
                                            ? 'View Preorder'
                                            : 'View Product'}
                                    </Text>
                                </View>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {count > 1 && (
                <>
                    <Pressable
                        onPress={() => goTo(index - 1)}
                        accessibilityRole="button"
                        accessibilityLabel="Previous coming soon item"
                        hitSlop={8}
                        style={{ top: IMAGE_HEIGHT / 2 - 18 }}
                        className="absolute left-2.5 h-9 w-9 items-center justify-center rounded-full bg-white/90"
                    >
                        <ChevronLeft size={20} color="#334155" />
                    </Pressable>

                    <Pressable
                        onPress={() => goTo(index + 1)}
                        accessibilityRole="button"
                        accessibilityLabel="Next coming soon item"
                        hitSlop={8}
                        style={{ top: IMAGE_HEIGHT / 2 - 18 }}
                        className="absolute right-2.5 h-9 w-9 items-center justify-center rounded-full bg-white/90"
                    >
                        <ChevronRight size={20} color="#334155" />
                    </Pressable>

                    <View
                        style={{ top: IMAGE_HEIGHT - 34, alignSelf: 'center' }}
                        className="absolute flex-row items-center gap-2 rounded-full bg-black/20 px-3 py-2"
                        pointerEvents="none"
                    >
                        {products.map((product, position) => (
                            <View
                                key={product.id}
                                className={`h-2 rounded-full ${position === index ? 'w-5 bg-white' : 'w-2 bg-white/60'}`}
                            />
                        ))}
                    </View>
                </>
            )}
        </View>
    );
}
