import {
    Layers3,
    Ruler,
    School,
} from 'lucide-react';

import type {
    LucideIcon,
} from 'lucide-react';

type VariantMode =
    | 'program_and_size'
    | 'size_only'
    | 'standard';

interface VariantBadgeProps {
    mode: VariantMode;
    label: string;
    variantsCount: number;
}

export default function VariantBadge({
    mode,
    label,
    variantsCount,
}: VariantBadgeProps) {
    const Icon =
        variantModeDetails(mode).icon;

    return (
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                <Icon size={16} />
            </div>

            <div>
                <p className="text-xs font-bold text-slate-800">
                    {label}
                </p>

                <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatVariantCount(
                        variantsCount,
                    )}
                </p>
            </div>
        </div>
    );
}

interface VariantModeDetails {
    icon: LucideIcon;
}

function variantModeDetails(
    mode: VariantMode,
): VariantModeDetails {
    switch (mode) {
        case 'program_and_size':
            return {
                icon: School,
            };

        case 'size_only':
            return {
                icon: Ruler,
            };

        case 'standard':
            return {
                icon: Layers3,
            };
    }
}

function formatVariantCount(
    variantsCount: number,
): string {
    return `${variantsCount} ${
        variantsCount === 1
            ? 'variant'
            : 'variants'
    }`;
}