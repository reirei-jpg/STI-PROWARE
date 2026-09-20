import Constants from 'expo-constants';
import { BadgeCheck, LogOut } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row items-center justify-between border-b border-slate-100 py-3">
            <Text className="font-sans-medium text-sm text-slate-500">
                {label}
            </Text>

            <Text className="ml-4 flex-1 text-right font-sans-semibold text-sm text-slate-900">
                {value}
            </Text>
        </View>
    );
}

export default function Profile() {
    const insets = useSafeAreaInsets();
    const { user, signOut } = useAuth();

    const isActive = user?.student?.status === 'active';

    const confirmSignOut = (): void => {
        Alert.alert('Log out?', 'You will need to sign in again to order.', [
            { text: 'Stay signed in', style: 'cancel' },
            {
                text: 'Log out',
                style: 'destructive',
                onPress: () => void signOut(),
            },
        ]);
    };

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
                <Row
                    label="Student ID"
                    value={user?.student?.studentId ?? 'Not provided'}
                />

                <Row
                    label="Course / Program"
                    value={user?.student?.course ?? 'Not provided'}
                />

                <Row
                    label="Year Level"
                    value={user?.student?.yearLevel ?? 'Not provided'}
                />

                <Row label="Email Address" value={user?.email ?? 'Not provided'} />
            </View>

            <View className="flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                        <BadgeCheck size={22} color="#059669" />
                    </View>

                    <View>
                        <Text className="font-sans-bold text-[11px] uppercase text-slate-400">
                            Account Status
                        </Text>

                        <Text className="font-sans-bold text-base text-slate-900">
                            Student Account
                        </Text>
                    </View>
                </View>

                <View
                    className={`rounded-full px-3 py-1.5 ${isActive ? 'bg-emerald-100' : 'bg-slate-200'}`}
                >
                    <Text
                        className={`font-sans-bold text-xs uppercase ${isActive ? 'text-emerald-700' : 'text-slate-600'}`}
                    >
                        {user?.student?.status ?? '-'}
                    </Text>
                </View>
            </View>

            <Pressable
                onPress={confirmSignOut}
                accessibilityRole="button"
                className="flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-4"
            >
                <LogOut size={18} color="#334155" />

                <Text className="font-sans-bold text-base text-slate-700">
                    Log out
                </Text>
            </Pressable>

            <Text className="text-center font-sans text-xs text-slate-400">
                STI PROWARE app version {Constants.expoConfig?.version ?? '-'}
            </Text>
        </ScrollView>
    );
}
