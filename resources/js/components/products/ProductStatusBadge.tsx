type AvailabilityStatus =
    | 'available'
    | 'coming_soon'
    | 'out_of_stock'
    | 'inactive';

interface ProductStatusBadgeProps {
    status: AvailabilityStatus;
    label: string;
}

export default function ProductStatusBadge({
    status,
    label,
}: ProductStatusBadgeProps) {
    return (
        <span
            className={`
                inline-flex items-center
                rounded-full px-3 py-1
                text-xs font-bold

                ${statusClasses(status)}
            `}
        >
            {label}
        </span>
    );
}

function statusClasses(
    status: AvailabilityStatus,
): string {
    switch (status) {
        case 'available':
            return 'bg-emerald-100 text-emerald-700';

        case 'coming_soon':
            return 'bg-amber-100 text-amber-700';

        case 'out_of_stock':
            return 'bg-red-100 text-red-700';

        case 'inactive':
            return 'bg-slate-200 text-slate-600';
    }
}