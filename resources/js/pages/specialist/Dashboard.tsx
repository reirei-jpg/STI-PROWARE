import {
    Head,
    Link,
} from '@inertiajs/react';

import {
    ArrowRight,
    CheckCircle2,
    Clock3,
    PackageCheck,
    PackageOpen,
    QrCode,
    TrendingDown,
    Truck,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import SpecialistLayout from '@/layouts/SpecialistLayout';

import specialist from '@/routes/specialist';

interface SpecialistStats {
    ready_for_release: number;
    to_prepare: number;
    released_today: number;
    low_stock: number;
    out_of_stock: number;
    deliveries_expected: number;
}

interface DashboardProps {
    stats: SpecialistStats;
}

export default function Dashboard({
    stats,
}: DashboardProps) {
    return (
        <SpecialistLayout>
            <Head title="Specialist Dashboard" />

            <div className="mx-auto max-w-7xl space-y-6">
                {/* PRIMARY SPECIALIST ACTION */}
                <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#0D6EFD] via-blue-600 to-blue-700 p-6 text-white shadow-sm sm:p-8">
                    <div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="max-w-2xl">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                                <QrCode size={28} />
                            </div>

                            <p className="mt-5 text-xs font-black uppercase tracking-wide text-blue-100">
                                Primary Specialist Action
                            </p>

                            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                                Scan Student Order QR
                            </h1>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
                                Scan the same QR used during
                                payment to open the
                                student&apos;s exact paid
                                order, verify the
                                merchandise, and release it.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                            <Link
                                href="/orders/scanner"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-blue-900 transition hover:bg-yellow-300"
                            >
                                <QrCode size={18} />

                                Scan Order QR
                            </Link>
                        </div>
                    </div>

                    <QrCode
                        size={200}
                        strokeWidth={1}
                        className="absolute -bottom-8 right-10 hidden text-white/10 xl:block"
                    />
                </section>

                {/* HANDING OUT ORDERS */}
                <section>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">
                            Orders To Hand Out
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Paid orders waiting on you, and
                            what you&apos;ve released today.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <StatCard
                            title="Ready for Release"
                            value={stats.ready_for_release}
                            description="Prepared — waiting for the student to claim"
                            href={specialist.orders.index.url()}
                            icon={PackageCheck}
                            tone="green"
                        />

                        <StatCard
                            title="Waiting to Be Prepared"
                            value={stats.to_prepare}
                            description="Paid orders you still need to prepare"
                            href={specialist.orders.index.url()}
                            icon={Clock3}
                            tone="amber"
                        />

                        <StatCard
                            title="Released Today"
                            value={stats.released_today}
                            description="Orders handed over since midnight"
                            href="/specialist/releases?date=today"
                            icon={CheckCircle2}
                            tone="blue"
                        />
                    </div>
                </section>

                {/* STOCK + DELIVERIES */}
                <section>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">
                            Stock &amp; Deliveries
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            What needs restocking, and what
                            deliveries are still on the way.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <StatCard
                            title="Low Stock"
                            value={stats.low_stock}
                            description="At or below the reorder level"
                            href="/staff/inventory?status=low_stock"
                            icon={TrendingDown}
                            tone="amber"
                        />

                        <StatCard
                            title="Out of Stock"
                            value={stats.out_of_stock}
                            description="No available stock left"
                            href="/staff/inventory?status=out_of_stock"
                            icon={PackageOpen}
                            tone="red"
                        />

                        <StatCard
                            title="Deliveries Expected"
                            value={stats.deliveries_expected}
                            description="Purchase orders still waiting to be received"
                            href="/staff/stock-receipts/create"
                            icon={Truck}
                            tone="blue"
                        />
                    </div>
                </section>
            </div>
        </SpecialistLayout>
    );
}

type StatTone = 'green' | 'amber' | 'blue' | 'red';

const STAT_TONES: Record<
    StatTone,
    { card: string; icon: string; value: string }
> = {
    green: {
        card: 'border-emerald-200 bg-emerald-50/60',
        icon: 'bg-emerald-100 text-emerald-700',
        value: 'text-emerald-700',
    },
    amber: {
        card: 'border-amber-200 bg-amber-50/60',
        icon: 'bg-amber-100 text-amber-700',
        value: 'text-amber-700',
    },
    blue: {
        card: 'border-blue-200 bg-blue-50/60',
        icon: 'bg-blue-100 text-blue-700',
        value: 'text-blue-700',
    },
    red: {
        card: 'border-red-200 bg-red-50/60',
        icon: 'bg-red-100 text-red-700',
        value: 'text-red-700',
    },
};

function StatCard({
    title,
    value,
    description,
    href,
    icon: Icon,
    tone,
}: {
    title: string;
    value: number;
    description: string;
    href: string;
    icon: LucideIcon;
    tone: StatTone;
}) {
    const style = STAT_TONES[tone];

    return (
        <Link
            href={href}
            className={`group rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${style.card}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-slate-700">
                        {title}
                    </p>

                    <p
                        className={`mt-2 text-3xl font-black ${style.value}`}
                    >
                        {value}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
                >
                    <Icon size={20} />
                </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
                {description}
            </p>

            <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-slate-600 group-hover:text-slate-900">
                View
                <ArrowRight size={13} />
            </p>
        </Link>
    );
}
