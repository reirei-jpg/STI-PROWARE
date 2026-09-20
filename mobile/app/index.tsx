import { LogOut } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';

export default function Home() {
    const insets = useSafeAreaInsets();
    const { user, signOut } = useAuth();

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
            <View className="rounded-3xl bg-brand p-6">
                <Text className="font-sans-bold text-xs uppercase tracking-wide text-blue-100">
                    Signed in
                </Text>

                <Text className="mt-1 font-sans-bold text-3xl text-white">
                    Hello, {user?.name}
                </Text>

                <Text className="mt-2 font-sans text-sm leading-6 text-blue-100">
                    The Home and catalog screen comes next.
                </Text>
            </View>

            <View className="rounded-2xl border border-slate-200 bg-white p-5">
                <Text className="font-sans-semibold text-sm text-slate-700">
                    Your account
                </Text>

                <Text className="mt-2 font-sans text-slate-500">
                    {user?.email}
                </Text>

                <Text className="font-sans text-slate-500">
                    {user?.student?.studentId} · {user?.student?.course} · Year{' '}
                    {user?.student?.yearLevel}
                </Text>
            </View>

            <Pressable
                onPress={() => void signOut()}
                accessibilityRole="button"
                className="flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-4"
            >
                <LogOut size={18} color="#334155" />

                <Text className="font-sans-bold text-base text-slate-700">
                    Log out
                </Text>
            </Pressable>
        </ScrollView>
    );
}
