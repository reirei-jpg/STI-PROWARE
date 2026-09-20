import { router } from 'expo-router';
import { PackageOpen, Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ComingSoonCard from '@/components/ComingSoonCard';
import ProductCard from '@/components/ProductCard';
import { useAuth } from '@/lib/auth';
import type { StatusFilter } from '@/lib/catalog';
import { useCatalog } from '@/lib/useCatalog';

const FILTERS: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: '' },
    { label: 'Available', value: 'available' },
    { label: 'Coming Soon', value: 'coming_soon' },
    { label: 'Out of Stock', value: 'out_of_stock' },
];

const SIDE_PADDING = 20;
const GAP = 12;

function openProduct(id: number): void {
    router.push({ pathname: '/product/[id]', params: { id: String(id) } });
}

export default function Home() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { user } = useAuth();

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<StatusFilter>('');

    // Wait for a short pause in typing before asking the server.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput), 400);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const catalog = useCatalog(search, status);

    const cardWidth = Math.floor((width - SIDE_PADDING * 2 - GAP) / 2);
    const carouselWidth = Math.min(280, width - 80);

    // Like the website: with the Coming Soon filter on, the carousel is the
    // result and the grid stays empty.
    const showingComingSoonOnly = status === 'coming_soon';
    const gridProducts = showingComingSoonOnly ? [] : catalog.products;
    const filtersActive = search !== '' || status !== '';
    const matchingCount = showingComingSoonOnly
        ? catalog.comingSoon.length
        : catalog.total;

    const firstName = user?.name.split(' ')[0] ?? '';

    const listHeader = (
        <View style={{ paddingHorizontal: SIDE_PADDING }} className="gap-5 pb-1">
            {catalog.comingSoon.length > 0 && (
                <View className="gap-3">
                    <View>
                        <Text className="font-sans-bold text-xl text-slate-900">
                            Coming Soon
                        </Text>

                        <Text className="font-sans text-sm text-slate-500">
                            Upcoming merchandise you can preorder
                        </Text>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: GAP }}
                        style={{ marginHorizontal: -SIDE_PADDING }}
                        contentInset={{ left: SIDE_PADDING, right: SIDE_PADDING }}
                    >
                        <View style={{ width: SIDE_PADDING - GAP }} />

                        {catalog.comingSoon.map((product) => (
                            <Pressable
                                key={product.id}
                                onPress={() => openProduct(product.id)}
                                accessibilityRole="button"
                                accessibilityLabel={product.name}
                            >
                                <ComingSoonCard
                                    product={product}
                                    width={carouselWidth}
                                />
                            </Pressable>
                        ))}

                        <View style={{ width: SIDE_PADDING - GAP }} />
                    </ScrollView>
                </View>
            )}

            {!catalog.loading && !catalog.error && (
                <Text className="font-sans-semibold text-sm text-slate-500">
                    {filtersActive
                        ? `${matchingCount} matching product${matchingCount === 1 ? '' : 's'}`
                        : 'Merchandise'}
                </Text>
            )}

            {catalog.loading && (
                <View className="items-center py-16">
                    <ActivityIndicator size="large" color="#0D6EFD" />
                </View>
            )}

            {catalog.error && (
                <View className="items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
                    <Text className="text-center font-sans-semibold text-sm text-red-700">
                        {catalog.error}
                    </Text>

                    <Pressable
                        onPress={catalog.retry}
                        accessibilityRole="button"
                        className="rounded-full bg-red-600 px-5 py-2"
                    >
                        <Text className="font-sans-bold text-sm text-white">
                            Try again
                        </Text>
                    </Pressable>
                </View>
            )}

            {showingComingSoonOnly && !catalog.loading && !catalog.error && (
                <View className="items-center rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <Text className="text-center font-sans-semibold text-sm text-amber-800">
                        Coming Soon products are shown above.
                    </Text>
                </View>
            )}

            {!catalog.loading &&
                !catalog.error &&
                !showingComingSoonOnly &&
                gridProducts.length === 0 && (
                    <View className="items-center gap-2 rounded-3xl border border-slate-200 bg-white px-6 py-12">
                        <PackageOpen size={40} color="#94a3b8" />

                        <Text className="font-sans-bold text-lg text-slate-900">
                            No products found
                        </Text>

                        <Text className="text-center font-sans text-sm text-slate-500">
                            {filtersActive
                                ? 'Try a different search or filter.'
                                : 'There is no merchandise to show right now.'}
                        </Text>
                    </View>
                )}
        </View>
    );

    return (
        <View className="flex-1 bg-page">
            <View
                className="gap-4 px-5 pb-3"
                style={{ paddingTop: insets.top + 12 }}
            >
                <View className="flex-row items-center gap-3">
                    <Image
                        source={require('../../assets/icon.png')}
                        className="h-11 w-11 rounded-xl"
                    />

                    <View className="flex-1">
                        <Text className="font-sans-bold text-xl tracking-tight text-slate-900">
                            PROWARE
                        </Text>

                        <Text
                            numberOfLines={1}
                            className="font-sans-medium text-xs text-slate-500"
                        >
                            Hello, {firstName}
                        </Text>
                    </View>
                </View>

                <View className="justify-center">
                    <View className="absolute left-4 z-10">
                        <Search size={18} color="#64748b" />
                    </View>

                    <TextInput
                        value={searchInput}
                        onChangeText={setSearchInput}
                        placeholder="Search code, name, or category..."
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        className="w-full rounded-full border border-slate-200 bg-white py-3 pl-12 pr-11 font-sans-medium text-sm text-slate-900"
                    />

                    {searchInput !== '' && (
                        <Pressable
                            onPress={() => setSearchInput('')}
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                            hitSlop={12}
                            className="absolute right-4 z-10"
                        >
                            <X size={18} color="#64748b" />
                        </Pressable>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ gap: 8 }}
                >
                    {FILTERS.map((filter) => {
                        const active = status === filter.value;

                        return (
                            <Pressable
                                key={filter.label}
                                onPress={() => setStatus(filter.value)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                className={`rounded-full border px-4 py-2 ${active ? 'border-brand bg-brand' : 'border-slate-200 bg-white'}`}
                            >
                                <Text
                                    className={`font-sans-semibold text-sm ${active ? 'text-white' : 'text-slate-600'}`}
                                >
                                    {filter.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            <FlatList
                data={gridProducts}
                keyExtractor={(product) => String(product.id)}
                numColumns={2}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => openProduct(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={item.name}
                    >
                        <ProductCard product={item} width={cardWidth} />
                    </Pressable>
                )}
                columnWrapperStyle={{
                    gap: GAP,
                    paddingHorizontal: SIDE_PADDING,
                }}
                contentContainerStyle={{ gap: GAP, paddingBottom: 24 }}
                ListHeaderComponent={listHeader}
                ListFooterComponent={
                    catalog.loadingMore ? (
                        <View className="items-center py-4">
                            <ActivityIndicator color="#0D6EFD" />
                        </View>
                    ) : null
                }
                onEndReached={catalog.loadMore}
                onEndReachedThreshold={0.5}
                refreshing={catalog.refreshing}
                onRefresh={catalog.refresh}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            />
        </View>
    );
}
