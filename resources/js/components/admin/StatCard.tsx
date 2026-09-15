import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    progress?: number;
}

export default function StatCard({
    title,
    value,
    description,
    icon: Icon,
    progress = 0,
}: StatCardProps) {
    const safeProgress = Math.min(
        100,
        Math.max(0, progress),
    );

    return (
        <article
            className="
                rounded-3xl
                border
                border-slate-100
                bg-white
                p-6
                shadow-sm
            "
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-base font-bold text-slate-900">
                        {title}
                    </p>

                    <h3 className="mt-3 text-3xl font-bold text-slate-950">
                        {value}
                    </h3>
                </div>

                <div
                    className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-50
                        text-blue-600
                    "
                >
                    <Icon size={21} />
                </div>
            </div>

            <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                        width: `${safeProgress}%`,
                    }}
                />
            </div>

            <p className="mt-5 text-sm text-slate-500">
                {description}
            </p>
        </article>
    );
}