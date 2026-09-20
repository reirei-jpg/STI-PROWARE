import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** A placeholder for a tab whose screen has not been built yet. */
export default function ComingSoonScreen({
    icon: Icon,
    title,
    message,
}: {
    icon: LucideIcon;
    title: string;
    message: string;
}) {
    const insets = useSafeAreaInsets();

    return (
        <View
            className="flex-1 items-center justify-center bg-page px-8"
            style={{ paddingTop: insets.top }}
        >
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                <Icon size={30} color="#0D6EFD" />
            </View>

            <Text className="mt-5 font-sans-bold text-2xl text-slate-900">
                {title}
            </Text>

            <Text className="mt-2 text-center font-sans text-sm leading-6 text-slate-500">
                {message}
            </Text>

            <View className="mt-5 rounded-full bg-slate-100 px-4 py-1.5">
                <Text className="font-sans-semibold text-xs text-slate-500">
                    Coming soon
                </Text>
            </View>
        </View>
    );
}
