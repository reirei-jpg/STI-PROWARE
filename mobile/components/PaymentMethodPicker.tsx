import { Banknote, Smartphone, WalletCards, type LucideIcon } from 'lucide-react-native';
import { Image, Pressable, Text, TextInput, View } from 'react-native';

import type { PaymentMethod } from '@/lib/cart';
import { getServerUrl } from '@/lib/config';
import { formatPesos } from '@/lib/format';

const PAYMENT_OPTIONS: {
    value: PaymentMethod;
    title: string;
    description: string;
    Icon: LucideIcon;
}[] = [
    {
        value: 'cash',
        title: 'Cash',
        description: 'Pay directly to the PROWARE cashier.',
        Icon: Banknote,
    },
    {
        value: 'gcash',
        title: 'GCash',
        description: 'Pay online and provide your GCash reference number.',
        Icon: Smartphone,
    },
    {
        value: 'maya',
        title: 'Maya',
        description: 'Pay online and provide your Maya reference number.',
        Icon: WalletCards,
    },
];

function methodName(method: PaymentMethod): string {
    return method === 'gcash' ? 'GCash' : 'Maya';
}

/**
 * Cash, GCash or Maya. For GCash and Maya it shows the school QR, the amount
 * to pay and the reference number box. Used by checkout and by paying for a
 * ready preorder.
 */
export default function PaymentMethodPicker({
    method,
    onMethodChange,
    reference,
    onReferenceChange,
    total,
    disabled = false,
}: {
    method: PaymentMethod;
    onMethodChange: (method: PaymentMethod) => void;
    reference: string;
    onReferenceChange: (reference: string) => void;
    total: number | string;
    disabled?: boolean;
}) {
    return (
        <View className="gap-3 rounded-3xl border border-slate-200 bg-white p-4">
            <Text className="font-sans-bold text-base text-slate-900">
                Choose payment method
            </Text>

            <Text className="font-sans text-sm leading-6 text-slate-500">
                Cash is paid to the cashier. For GCash or Maya, enter the
                transaction reference number from your payment.
            </Text>

            {PAYMENT_OPTIONS.map(({ value, title, description, Icon }) => {
                const selected = method === value;

                return (
                    <Pressable
                        key={value}
                        onPress={() => onMethodChange(value)}
                        disabled={disabled}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        className={`flex-row items-center gap-3 rounded-2xl border p-3 ${selected ? 'border-brand bg-blue-50' : 'border-slate-200 bg-white'}`}
                    >
                        <View
                            className={`h-10 w-10 items-center justify-center rounded-xl ${selected ? 'bg-brand' : 'bg-slate-100'}`}
                        >
                            <Icon
                                size={20}
                                color={selected ? '#ffffff' : '#475569'}
                            />
                        </View>

                        <View className="flex-1">
                            <Text className="font-sans-bold text-sm text-slate-900">
                                {title}
                            </Text>

                            <Text className="font-sans text-xs leading-5 text-slate-500">
                                {description}
                            </Text>
                        </View>
                    </Pressable>
                );
            })}

            {method !== 'cash' && (
                <View className="mt-2 gap-3">
                    <View className="items-center rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <Text className="font-sans-bold text-xs uppercase text-blue-600">
                            School payment QR
                        </Text>

                        <Text className="mt-1 font-sans-bold text-base text-slate-900">
                            Pay with {methodName(method)}
                        </Text>

                        <Text className="mt-1 text-center font-sans text-sm leading-6 text-slate-500">
                            Scan the school QR using your {methodName(method)}{' '}
                            app, then enter the transaction reference number
                            below.
                        </Text>

                        <View className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                            <Image
                                source={{
                                    uri: `${getServerUrl()}/images/payments/${method}-qr.png`,
                                }}
                                accessibilityLabel={`STI PROWARE ${methodName(method)} payment QR`}
                                className="h-56 w-56"
                                resizeMode="contain"
                            />
                        </View>

                        <Text className="mt-3 font-sans-medium text-xs uppercase text-slate-400">
                            Amount to pay
                        </Text>

                        <Text className="font-sans-bold text-2xl text-slate-900">
                            {formatPesos(total)}
                        </Text>

                        <Text className="mt-2 text-center font-sans text-xs leading-5 text-slate-500">
                            Pay exactly this amount, then copy the
                            transaction/reference number after payment.
                        </Text>
                    </View>

                    <Text className="font-sans-bold text-sm text-slate-800">
                        {methodName(method)} transaction / reference number
                    </Text>

                    <TextInput
                        value={reference}
                        onChangeText={onReferenceChange}
                        placeholder={`Enter ${methodName(method)} reference number`}
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={100}
                        editable={!disabled}
                        accessibilityLabel="Payment reference number"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-sans-medium text-base text-slate-900"
                    />
                </View>
            )}
        </View>
    );
}
