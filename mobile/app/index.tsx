import { QrCode, ShoppingBag } from 'lucide-react-native';
import { Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Index() {
    const insets = useSafeAreaInsets();

    return (
        <ScrollView
            className="flex-1 bg-page"
            contentContainerStyle={{
                paddingTop: insets.top + 24,
                paddingBottom: insets.bottom + 24,
                paddingHorizontal: 20,
                gap: 20,
            }}
        >
            <View className="flex-row items-center gap-3">
                <Image
                    source={require('../assets/icon.png')}
                    className="h-14 w-14 rounded-xl"
                />

                <View>
                    <Text className="font-sans-bold text-2xl tracking-tight text-slate-900">
                        PROWARE
                    </Text>

                    <Text className="font-sans-medium text-xs text-slate-500">
                        Student Portal
                    </Text>
                </View>
            </View>

            <View className="rounded-3xl bg-brand p-6">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                    <ShoppingBag size={24} color="#ffffff" />
                </View>

                <Text className="mt-4 font-sans-bold text-xs uppercase tracking-wide text-blue-100">
                    Design check
                </Text>

                <Text className="mt-1 font-sans-bold text-3xl text-white">
                    Order your merchandise
                </Text>

                <Text className="mt-2 font-sans text-sm leading-6 text-blue-100">
                    The same blue, cards and font as the PROWARE website.
                </Text>

                <View className="mt-5 flex-row items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3">
                    <QrCode size={18} color="#1e3a8a" />

                    <Text className="font-sans-bold text-sm text-blue-900">
                        Show my order QR
                    </Text>
                </View>
            </View>

            <View className="rounded-2xl border border-slate-200 bg-white p-5">
                <Text className="font-sans-semibold text-sm text-slate-700">
                    Regular, medium, semibold and bold text
                </Text>

                <Text className="mt-2 font-sans text-slate-500">
                    Instrument Sans Regular
                </Text>

                <Text className="font-sans-medium text-slate-500">
                    Instrument Sans Medium
                </Text>

                <Text className="font-sans-semibold text-slate-500">
                    Instrument Sans SemiBold
                </Text>

                <Text className="font-sans-bold text-slate-500">
                    Instrument Sans Bold
                </Text>
            </View>
        </ScrollView>
    );
}
