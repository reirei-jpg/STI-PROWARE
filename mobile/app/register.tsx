import { router } from 'expo-router';
import {
    ArrowLeft,
    BookOpen,
    Check,
    Eye,
    EyeOff,
    GraduationCap,
    LockKeyhole,
    Mail,
    UserRound,
} from 'lucide-react-native';
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

function Field({
    label,
    icon,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    maxLength,
    autoComplete,
    editable = true,
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'numeric' | 'email-address';
    maxLength?: number;
    autoComplete?:
        | 'off'
        | 'name'
        | 'email'
        | 'new-password'
        | 'current-password';
    editable?: boolean;
}) {
    return (
        <View className="gap-2">
            <Text className="px-1 font-sans-bold text-sm text-slate-800">
                {label}
            </Text>

            <View className="justify-center">
                <View className="absolute left-5 z-10">{icon}</View>

                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    editable={editable}
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                    keyboardType={keyboardType ?? 'default'}
                    maxLength={maxLength}
                    autoCapitalize="none"
                    autoComplete={autoComplete ?? 'off'}
                    autoCorrect={false}
                    className={`w-full rounded-full border py-4 pl-14 pr-5 font-sans-medium text-base ${
                        editable
                            ? 'border-slate-300 bg-white text-slate-900'
                            : 'border-slate-200 bg-slate-100 text-slate-500'
                    }`}
                />
            </View>
        </View>
    );
}

function PasswordField({
    label,
    value,
    onChangeText,
    placeholder,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
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
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect={false}
                    className="w-full rounded-full border border-slate-300 bg-white py-4 pl-14 pr-14 font-sans-medium text-base text-slate-900"
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

function normalizeLastName(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

export default function Register() {
    const insets = useSafeAreaInsets();
    const { register } = useAuth();

    const [fullName, setFullName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [lastName, setLastName] = useState('');
    const [course, setCourse] = useState('');
    const [yearLevel, setYearLevel] = useState('');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const normalizedStudentId = studentId.replace(/\D/g, '');
    const normalizedLastName = normalizeLastName(lastName);
    const generatedEmail =
        normalizedStudentId.length === 11 && normalizedLastName.length > 0
            ? `${normalizedLastName}.${normalizedStudentId.slice(-6)}@sti.edu.ph`
            : '';

    const canSubmit =
        !submitting &&
        agreed &&
        fullName !== '' &&
        normalizedStudentId.length === 11 &&
        lastName !== '' &&
        course !== '' &&
        yearLevel !== '' &&
        password !== '' &&
        confirmation !== '';

    const handleYearLevelChange = (text: string): void => {
        const digitsOnly = text.replace(/\D/g, '').slice(0, 2);
        const clamped =
            digitsOnly !== '' && Number(digitsOnly) > 10 ? '10' : digitsOnly;

        setYearLevel(clamped);
    };

    const submit = async (): Promise<void> => {
        if (!canSubmit) {
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await register({
                full_name: fullName,
                student_id: normalizedStudentId,
                last_name: lastName,
                course,
                year_level: yearLevel,
                email: generatedEmail,
                password,
                password_confirmation: confirmation,
                terms: agreed,
            });
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-page"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
                    Create Account
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: insets.bottom + 24,
                    gap: 16,
                }}
                keyboardShouldPersistTaps="handled"
            >
                <Text className="px-1 font-sans text-sm leading-6 text-slate-500">
                    There is no school-roster check yet, so your details are
                    trusted directly. Your school email is generated
                    automatically from your last name and Student ID — you
                    cannot type your own.
                </Text>

                <Field
                    label="Full name"
                    icon={<UserRound size={19} color="#64748b" />}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Juan Dela Cruz"
                    autoComplete="name"
                />

                <Field
                    label="Student ID"
                    icon={<UserRound size={19} color="#64748b" />}
                    value={studentId}
                    onChangeText={(text) =>
                        setStudentId(text.replace(/\D/g, '').slice(0, 11))
                    }
                    placeholder="11-digit Student ID"
                    keyboardType="numeric"
                    maxLength={11}
                />

                <Field
                    label="Last name"
                    icon={<UserRound size={19} color="#64748b" />}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Dela Cruz"
                />

                <Field
                    label="Generated school email"
                    icon={<Mail size={19} color="#64748b" />}
                    value={generatedEmail}
                    editable={false}
                    placeholder="Fill in Student ID and last name first"
                />

                <Field
                    label="Course"
                    icon={<BookOpen size={19} color="#64748b" />}
                    value={course}
                    onChangeText={setCourse}
                    placeholder="BSIT"
                />

                <Field
                    label="Year level"
                    icon={<GraduationCap size={19} color="#64748b" />}
                    value={yearLevel}
                    onChangeText={handleYearLevelChange}
                    placeholder="1"
                    keyboardType="numeric"
                    maxLength={2}
                />

                <PasswordField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 8 characters, a letter, a number, a symbol"
                />

                <PasswordField
                    label="Confirm password"
                    value={confirmation}
                    onChangeText={setConfirmation}
                    placeholder="Re-enter your password"
                />

                <Pressable
                    onPress={() => setAgreed((current) => !current)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: agreed }}
                    className="flex-row items-start gap-3 px-1"
                >
                    <View
                        className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${agreed ? 'border-brand bg-brand' : 'border-slate-300 bg-white'}`}
                    >
                        {agreed && <Check size={14} color="#ffffff" />}
                    </View>

                    <Text className="flex-1 font-sans-medium text-sm text-slate-600">
                        I confirm that this information belongs to me.
                    </Text>
                </Pressable>

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
                        {submitting ? 'Creating account...' : 'Create account'}
                    </Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
