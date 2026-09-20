import { Text, View } from 'react-native';

import type { AvailabilityStatus } from '@/lib/catalog';

const STYLES: Record<AvailabilityStatus, { box: string; text: string }> = {
    available: { box: 'bg-emerald-100', text: 'text-emerald-700' },
    coming_soon: { box: 'bg-amber-100', text: 'text-amber-700' },
    out_of_stock: { box: 'bg-red-100', text: 'text-red-700' },
};

export default function AvailabilityBadge({
    status,
    label,
}: {
    status: AvailabilityStatus;
    label: string;
}) {
    const style = STYLES[status];

    return (
        <View className={`rounded-full px-2.5 py-1 ${style.box}`}>
            <Text className={`font-sans-bold text-[11px] ${style.text}`}>
                {label}
            </Text>
        </View>
    );
}
