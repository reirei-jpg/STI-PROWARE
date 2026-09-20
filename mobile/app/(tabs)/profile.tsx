import { LogOut } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';

function Row({ label, value }: { label: string; value: string | null }) {
    return (
        <View className="flex-row items-center justify-between border-b border-slate-100 py-3">
            <Text className="font-sans-medium text-sm text-slate-500">
                {label}
            </Text>

            <Text className="ml-4 flex-1 text-right font-sans-semibold text-sm text-slate-900">
                {value ?? '-'}
            </Text>
        </View>
    );
}

export default function Profile() {
    const insets = useSafeAreaInsets();
    const { user, signOut } = useAuth();

    return (
        <ScrollView
            className="flex-1 bg-page"
            contentContainerStyle={{
                paddingTop: insets.top + 24,
                paddingBottom: 32,
                paddingHorizontal: 20,
                gap: 20,
            }}
        >
            <View className="rounded-3xl bg-brand p-6">
                <Text className="font-sans-bold text-xs uppercase tracking-wide text-blue-100">
                    My Profile
                </Text>

                <Text className="mt-1 font-sans-bold text-3xl text-white">
                    {user?.name}
                </Text>

                <Text className="mt-2 font-sans text-sm text-blue-100">
                    {user?.email}
                </Text>
            </View>

            <View className="rounded-2xl border border-slate-200 bg-white px-5 py-2">
                <Row label="Student ID" value={user?.student?.studentId ?? null} />

                <Row label="Course" value={user?.student?.course ?? null} />

                <Row
                    label="Year level"
                    value={user?.student?.yearLevel ?? null}
                />

                <Row label="Status" value={user?.student?.status ?? null} />
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
