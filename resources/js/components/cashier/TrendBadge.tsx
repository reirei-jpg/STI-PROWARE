import {
    Minus,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';

interface TrendBadgeProps {
    trend: number | null;
    compareLabel: string;
}

/**
 * Shared between the Sales report's summary cards and the
 * cashier dashboard's "Today's Sales" popup, so a trend always
 * reads the same way wherever it appears.
 */
export default function TrendBadge({
    trend,
    compareLabel,
}: TrendBadgeProps) {
    if (trend === null) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Minus size={13} />
                No {compareLabel} data yet
            </span>
        );
    }

    if (trend === 0) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Minus size={13} />
                Same as {compareLabel}
            </span>
        );
    }

    const isUp = trend > 0;

    return (
        <span
            className={`
                inline-flex items-center gap-1 text-xs font-bold
                ${isUp ? 'text-emerald-600' : 'text-red-600'}
            `}
        >
            {isUp ? (
                <TrendingUp size={13} />
            ) : (
                <TrendingDown size={13} />
            )}
            {isUp ? '+' : ''}
            {trend}% vs {compareLabel}
        </span>
    );
}
