import { router } from 'expo-router';
import { ArrowLeft, CircleCheck, Eye, EyeOff, LockKeyhole } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function PasswordField({
    label,
    value,
    onChangeText,
    autoComplete,
    disabled,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    autoComplete: 'current-password' | 'new-password';
    disabled: boolean;
}) {
    const [shown, setShown] = useState(false);

    return (
        <View className="gap-2">
            <Text className="px-1 font-sans-bold text-sm text-slate-800">
                {label}
            </Text>

            <View className="justify-center">
                <View className="absolute left-5 z-10">
                    <LockKeyhole size={19} color="#64748b" />
                </View>

                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={!shown}
                    autoCapitalize="none"
                    autoComplete={autoComplete}
                    autoCorrect={false}
                    editable={!disabled}
                    accessibilityLabel={label}
                    className="w-full rounded-full border border-slate-200 bg-white py-4 pl-14 pr-14 font-sans-medium text-base text-slate-900"
                />

                <Pressable
                    onPress={() => setShown((current) => !current)}
                    accessibilityRole="button"
                    accessibilityLabel={shown ? 'Hide password' : 'Show password'}
                    hitSlop={12}
                    className="absolute right-5 z-10"
                >
                    {shown ? (
                        <EyeOff size={19} color="#64748b" />
                    ) : (
                        <Eye size={19} color="#64748b" />
                    )}
                </Pressable>
            </View>
        </View>
    );
}

export default function ChangePassword() {
    const insets = useSafeAreaInsets();
    const { request } = useAuth();

    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    const canSubmit =
        !submitting && current !== '' && next !== '' && confirmation !== '';

    const submit = async (): Promise<void> => {
        setSubmitting(true);
        setError(null);

        try {
            const response = await request<{ message: string }>(
                '/auth/password',
                {
                    method: 'PUT',
                    body: {
                        current_password: current,
                        password: next,
                        password_confirmation: confirmation,
                    },
                },
            );

            setCurrent('');
            setNext('');
            setConfirmation('');
            setDone(response.message);
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const header = (
        <View
            className="flex-row items-center gap-3 px-5 pb-3"
            style={{ paddingTop: insets.top + 12 }}
        >
            <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
            >
                <ArrowLeft size={20} color="#0f172a" />
            </Pressable>

            <Text className="font-sans-bold text-2xl text-slate-900">
                Change Password
            </Text>
        </View>
    );

    if (done) {
        return (
            <View className="flex-1 bg-page">
                {header}

                <View className="flex-1 items-center justify-center px-8">
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                        <CircleCheck size={32} color="#16a34a" />
                    </View>

                    <Text className="mt-5 font-sans-bold text-xl text-slate-900">
                        {done}
                    </Text>

                    <Text className="mt-2 text-center font-sans text-sm leading-6 text-slate-600">
                        Any other phone signed in to your account has been signed
                        out.
                    </Text>

                    <Pressable
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        className="mt-8 rounded-full bg-brand px-8 py-3"
                    >
                        <Text className="font-sans-bold text-sm text-white">
                            Back to profile
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-page"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {header}

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: insets.bottom + 24,
                    gap: 16,
                }}
                keyboardShouldPersistTaps="handled"
            >
                <Text className="px-1 font-sans text-sm leading-6 text-slate-500">
                    Enter your current password, then choose a new one. Use a
                    strong password: long, with upper and lower case letters,
                    numbers and symbols.
                </Text>

                <PasswordField
                    label="Current password"
                    value={current}
                    onChangeText={(text) => {
                        setCurrent(text);
                        setError(null);
                    }}
                    autoComplete="current-password"
                    disabled={submitting}
                />

                <PasswordField
                    label="New password"
                    value={next}
                    onChangeText={(text) => {
                        setNext(text);
                        setError(null);
                    }}
                    autoComplete="new-password"
                    disabled={submitting}
                />

                <PasswordField
                    label="Confirm new password"
                    value={confirmation}
                    onChangeText={(text) => {
                        setConfirmation(text);
                        setError(null);
                    }}
                    autoComplete="new-password"
                    disabled={submitting}
                />

                {error && (
                    <View className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
                        <Text className="font-sans-semibold text-xs leading-5 text-red-700">
                            {error}
                        </Text>
                    </View>
                )}

                <Pressable
                    onPress={() => void submit()}
                    disabled={!canSubmit}
                    accessibilityRole="button"
                    className={`flex-row items-center justify-center gap-2 rounded-full py-4 ${canSubmit ? 'bg-brand' : 'bg-slate-200'}`}
                >
                    {submitting && (
                        <ActivityIndicator size="small" color="#ffffff" />
                    )}

                    <Text
                        className={`font-sans-bold text-base ${canSubmit ? 'text-white' : 'text-slate-400'}`}
                    >
                        Save password
                    </Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
