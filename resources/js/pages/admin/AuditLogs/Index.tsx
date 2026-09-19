import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Clock3,
    FileClock,
    Search,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import {
    Head,
    router,
} from '@inertiajs/react';

import {
    useEffect,
    useState,
} from 'react';

import DetailPopup from '@/components/action-feedback/DetailPopup';

import AdminLayout from '@/layouts/AdminLayout';

interface AuditUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface OrderSubjectSummary {
    order_number: string;
    student_name: string;
    payment_status: string;
    fulfillment_status: string;
    total: string;
}

interface UserSubjectSummary {
    name: string;
    email: string;
    role: string;
    is_active: boolean;
}

interface ProductSubjectSummary {
    code: string;
    name: string;
    category_name: string;
    base_price: string;
    is_active: boolean;
}

interface AuditLogItem {
    id: number;
    user_id: number | null;

    actor_name?: string | null;
    actor_email?: string | null;
    actor_role?: string | null;

    action: string;
    module: string;
    description: string;
    user: AuditUser | null;
    subject_type: string | null;
    subject_id: number | null;
    related_record_url: string | null;
    subject_summary:
        | OrderSubjectSummary
        | UserSubjectSummary
        | ProductSubjectSummary
        | null;
    old_values: Record<
        string,
        unknown
    > | null;
    new_values: Record<
        string,
        unknown
    > | null;
    created_at: string | null;
}

interface PaginatedLogs {
    current_page: number;
    data: AuditLogItem[];
    from: number | null;
    last_page: number;
    next_page_url: string | null;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

interface AuditSummary {
    total: number;
    today: number;
    this_week: number;
    active_staff_today: number;
}

interface ModuleBreakdownRow {
    module: string;
    count: number;
}

interface DailyBreakdownRow {
    label: string;
    count: number;
    is_today: boolean;
}

interface ActiveStaffRow {
    user_id: number;
    name: string | null;
    role: string | null;
    action_count: number;
}

interface AuditCardDetails {
    total: {
        module_breakdown: ModuleBreakdownRow[];
    };
    today: {
        module_breakdown: ModuleBreakdownRow[];
    };
    this_week: {
        daily_breakdown: DailyBreakdownRow[];
    };
    active_staff_today: {
        staff: ActiveStaffRow[];
    };
}

type SummaryCardKey = keyof AuditCardDetails;

interface AuditFilters {
    search: string;
    module: string;
    action: string;
}

interface AuditLogsPageProps {
    logs: PaginatedLogs;
    summary: AuditSummary;
    cardDetails: AuditCardDetails;
    filters: AuditFilters;
    modules: string[];
    actions: string[];
}

export default function Index({
    logs,
    summary,
    cardDetails,
    filters,
    modules,
    actions,
}: AuditLogsPageProps) {
    const [
        activeCard,
        setActiveCard,
    ] = useState<SummaryCardKey | null>(
        null,
    );

    const [
        detailsLog,
        setDetailsLog,
    ] = useState<AuditLogItem | null>(
        null,
    );

    const [
        search,
        setSearch,
    ] = useState(
        filters.search ?? '',
    );

    const [
        selectedModule,
        setSelectedModule,
    ] = useState(
        filters.module ?? 'all',
    );

    const [
        selectedAction,
        setSelectedAction,
    ] = useState(
        filters.action ?? 'all',
    );

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    const normalized =
                        search.trim();

                    if (
                        normalized ===
                        (
                            filters.search
                            ?? ''
                        )
                    ) {
                        return;
                    }

                    router.get(
                        '/admin/audit-logs',
                        {
                            search:
                                normalized
                                || undefined,

                            module:
                                selectedModule ===
                                'all'
                                    ? undefined
                                    : selectedModule,

                            action:
                                selectedAction ===
                                'all'
                                    ? undefined
                                    : selectedAction,
                        },
                        {
                            preserveState: true,
                            preserveScroll: true,
                            replace: true,
                        },
                    );
                },
                350,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [
        search,
        filters.search,
        selectedModule,
        selectedAction,
    ]);

    const applyFilters = (
        module: string,
        action: string,
    ): void => {
        router.get(
            '/admin/audit-logs',
            {
                search:
                    search.trim()
                    || undefined,

                module:
                    module === 'all'
                        ? undefined
                        : module,

                action:
                    action === 'all'
                        ? undefined
                        : action,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const changeModule = (
        value: string,
    ): void => {
        setSelectedModule(
            value,
        );

        applyFilters(
            value,
            selectedAction,
        );
    };

    const changeAction = (
        value: string,
    ): void => {
        setSelectedAction(
            value,
        );

        applyFilters(
            selectedModule,
            value,
        );
    };

    const clearFilters = (): void => {
        setSearch('');
        setSelectedModule('all');
        setSelectedAction('all');

        router.get(
            '/admin/audit-logs',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const visitPage = (
        url: string | null,
    ): void => {
        if (!url) {
            return;
        }

        router.visit(
            url,
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const hasFilters =
        Boolean(
            search.trim()
            || selectedModule !== 'all'
            || selectedAction !== 'all',
        );

    return (
        <AdminLayout>
            <Head title="Audit Logs" />

            <div className="mx-auto max-w-7xl space-y-5">
                {/* HEADER */}
                <section
                    className="
                        flex
                        flex-col
                        gap-4
                        lg:flex-row
                        lg:items-end
                        lg:justify-between
                    "
                >
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            Audit Logs
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Review important system
                            actions, account activity,
                            and transaction history.
                        </p>
                    </div>

                    <div
                        className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-xl
                            border
                            border-blue-100
                            bg-blue-50
                            px-4
                            py-2.5
                            text-xs
                            font-bold
                            text-blue-700
                        "
                    >
                        <ShieldCheck
                            size={16}
                        />

                        Admin-only history
                    </div>
                </section>

                {/* SUMMARY */}
                <section
                    className="
                        grid
                        gap-3
                        sm:grid-cols-2
                        lg:grid-cols-4
                    "
                >
                    <SummaryCard
                        label="Total Logs"
                        value={
                            summary.total
                        }
                        tone="slate"
                        onClick={() =>
                            setActiveCard(
                                'total',
                            )
                        }
                    />

                    <SummaryCard
                        label="Today"
                        value={
                            summary.today
                        }
                        tone="blue"
                        onClick={() =>
                            setActiveCard(
                                'today',
                            )
                        }
                    />

                    <SummaryCard
                        label="This Week"
                        value={
                            summary.this_week
                        }
                        tone="green"
                        onClick={() =>
                            setActiveCard(
                                'this_week',
                            )
                        }
                    />

                    <SummaryCard
                        label="Active Staff Today"
                        value={
                            summary.active_staff_today
                        }
                        tone="amber"
                        onClick={() =>
                            setActiveCard(
                                'active_staff_today',
                            )
                        }
                    />
                </section>

                {/* FILTERS */}
                <section
                    className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-4
                        shadow-sm
                    "
                >
                    <div
                        className="
                            grid
                            gap-3
                            lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]
                        "
                    >
                        {/* SEARCH */}
                        <div className="relative">
                            <Search
                                size={18}
                                className="
                                    absolute
                                    left-4
                                    top-1/2
                                    -translate-y-1/2
                                    text-slate-400
                                "
                            />

                            <input
                                type="search"
                                value={search}
                                onChange={(
                                    event,
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Search user, action, module, description..."
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    py-3
                                    pl-11
                                    pr-4
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                "
                            />
                        </div>

                        {/* MODULE */}
                        <select
                            value={
                                selectedModule
                            }
                            onChange={(
                                event,
                            ) =>
                                changeModule(
                                    event.target.value,
                                )
                            }
                            className="
                                rounded-xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-3
                                text-sm
                                font-semibold
                                text-slate-700
                                outline-none
                                transition
                                focus:border-blue-500
                                focus:ring-4
                                focus:ring-blue-100
                            "
                        >
                            <option value="all">
                                All Modules
                            </option>

                            {modules.map(
                                (module) => (
                                    <option
                                        key={
                                            module
                                        }
                                        value={
                                            module
                                        }
                                    >
                                        {formatValue(
                                            module,
                                        )}
                                    </option>
                                ),
                            )}
                        </select>

                        {/* ACTION */}
                        <select
                            value={
                                selectedAction
                            }
                            onChange={(
                                event,
                            ) =>
                                changeAction(
                                    event.target.value,
                                )
                            }
                            className="
                                rounded-xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-3
                                text-sm
                                font-semibold
                                text-slate-700
                                outline-none
                                transition
                                focus:border-blue-500
                                focus:ring-4
                                focus:ring-blue-100
                            "
                        >
                            <option value="all">
                                All Actions
                            </option>

                            {actions.map(
                                (action) => (
                                    <option
                                        key={
                                            action
                                        }
                                        value={
                                            action
                                        }
                                    >
                                        {formatValue(
                                            action,
                                        )}
                                    </option>
                                ),
                            )}
                        </select>

                        {hasFilters && (
                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className="
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    font-bold
                                    text-slate-600
                                    transition
                                    hover:bg-slate-50
                                "
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </section>

                {/* LOG LIST */}
                <section
                    className="
                        overflow-hidden
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        shadow-sm
                    "
                >
                    <div
                        className="
                            flex
                            items-center
                            justify-between
                            border-b
                            border-slate-100
                            px-5
                            py-4
                            sm:px-6
                        "
                    >
                        <div>
                            <h2 className="font-black text-slate-900">
                                System Activity
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                {logs.total}{' '}
                                record
                                {logs.total === 1
                                    ? ''
                                    : 's'}
                            </p>
                        </div>

                        <FileClock
                            size={20}
                            className="text-blue-600"
                        />
                    </div>

                    {logs.data.length >
                    0 ? (
                        <>
                            <div className="divide-y divide-slate-100">
                                {logs.data.map(
                                    (log) => (
                                        <AuditLogRow
                                            key={
                                                log.id
                                            }
                                            log={
                                                log
                                            }
                                            onViewDetails={() =>
                                                setDetailsLog(
                                                    log,
                                                )
                                            }
                                        />
                                    ),
                                )}
                            </div>

                            {/* PAGINATION */}
                            <div
                                className="
                                    flex
                                    flex-col
                                    gap-3
                                    border-t
                                    border-slate-100
                                    px-5
                                    py-4
                                    sm:flex-row
                                    sm:items-center
                                    sm:justify-between
                                    sm:px-6
                                "
                            >
                                <p className="text-xs text-slate-500">
                                    Showing{' '}
                                    <strong>
                                        {logs.from
                                            ?? 0}
                                    </strong>
                                    {' '}to{' '}
                                    <strong>
                                        {logs.to
                                            ?? 0}
                                    </strong>
                                    {' '}of{' '}
                                    <strong>
                                        {
                                            logs.total
                                        }
                                    </strong>
                                </p>

                                <div className="flex items-center gap-2">
                                    <PaginationButton
                                        disabled={
                                            !logs
                                                .prev_page_url
                                        }
                                        onClick={() =>
                                            visitPage(
                                                logs
                                                    .prev_page_url,
                                            )
                                        }
                                    >
                                        <ChevronLeft
                                            size={17}
                                        />
                                    </PaginationButton>

                                    <span
                                        className="
                                            rounded-xl
                                            bg-slate-100
                                            px-4
                                            py-2.5
                                            text-xs
                                            font-bold
                                            text-slate-600
                                        "
                                    >
                                        {
                                            logs.current_page
                                        }
                                        {' / '}
                                        {
                                            logs.last_page
                                        }
                                    </span>

                                    <PaginationButton
                                        disabled={
                                            !logs
                                                .next_page_url
                                        }
                                        onClick={() =>
                                            visitPage(
                                                logs
                                                    .next_page_url,
                                            )
                                        }
                                    >
                                        <ChevronRight
                                            size={17}
                                        />
                                    </PaginationButton>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <FileClock
                                size={40}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-4 font-black text-slate-800">
                                No audit logs found
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Try changing your
                                search or filters.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <DetailPopup
                open={activeCard !== null}
                title={
                    activeCard
                        ? CARD_META[activeCard].title
                        : ''
                }
                icon={
                    activeCard
                        ? CARD_META[activeCard].icon
                        : FileClock
                }
                onClose={() =>
                    setActiveCard(null)
                }
            >
                {activeCard === 'total' && (
                    <ModuleBreakdownList
                        rows={
                            cardDetails.total
                                .module_breakdown
                        }
                    />
                )}

                {activeCard === 'today' && (
                    <ModuleBreakdownList
                        rows={
                            cardDetails.today
                                .module_breakdown
                        }
                    />
                )}

                {activeCard === 'this_week' && (
                    <DailyBreakdownList
                        rows={
                            cardDetails.this_week
                                .daily_breakdown
                        }
                    />
                )}

                {activeCard === 'active_staff_today' && (
                    <ActiveStaffList
                        rows={
                            cardDetails
                                .active_staff_today
                                .staff
                        }
                    />
                )}
            </DetailPopup>

            <DetailPopup
                open={detailsLog !== null}
                title={
                    detailsLog
                        ? getActivityTitle(
                              detailsLog.action,
                              detailsLog.module,
                          )
                        : ''
                }
                icon={FileClock}
                onClose={() =>
                    setDetailsLog(null)
                }
                actionHref={
                    detailsLog?.related_record_url
                    ?? undefined
                }
                actionLabel={
                    detailsLog?.module === 'orders'
                        ? 'View Full Order'
                        : detailsLog?.module === 'users'
                          ? 'View Full Account'
                          : undefined
                }
            >
                {detailsLog && (
                    <div className="space-y-5">
                        <p className="text-sm leading-6 text-slate-600">
                            {
                                detailsLog.description
                            }
                        </p>

                        {detailsLog.related_record_url && (
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                    {getRecordLabel(
                                        detailsLog.module,
                                        detailsLog.action,
                                    )}{' '}
                                    #
                                    {
                                        detailsLog.subject_id
                                    }
                                </p>

                                <div className="mt-3">
                                    <RecordSummary
                                        log={
                                            detailsLog
                                        }
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                Changes Made
                            </p>

                            <div className="mt-3">
                                <ChangesList
                                    oldValues={
                                        detailsLog.old_values
                                    }
                                    newValues={
                                        detailsLog.new_values
                                    }
                                />
                            </div>
                        </div>
                    </div>
                )}
            </DetailPopup>
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Record Summary
|--------------------------------------------------------------------------
*/

function RecordSummary({
    log,
}: {
    log: AuditLogItem;
}) {
    if (! log.subject_summary) {
        return (
            <p className="text-sm text-slate-500">
                This record's live details
                aren't available anymore
                (it may have since been
                deleted), but the Changes
                Made details above still
                show what happened.
            </p>
        );
    }

    if (log.module === 'orders') {
        const order =
            log.subject_summary as OrderSubjectSummary;

        return (
            <div className="space-y-4">
                <div className="rounded-2xl bg-blue-50 p-5 text-center">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                        {order.order_number}
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-900">
                        {formatCurrency(
                            order.total,
                        )}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        {order.student_name}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                            Payment
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-900">
                            {formatValue(
                                order.payment_status,
                            )}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                            Fulfillment
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-900">
                            {formatValue(
                                order.fulfillment_status,
                            )}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (log.module === 'products') {
        const product =
            log.subject_summary as ProductSubjectSummary;

        return (
            <div className="space-y-4">
                <div className="rounded-2xl bg-blue-50 p-5 text-center">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                        {product.code}
                    </p>

                    <p className="mt-1 text-lg font-black text-slate-900">
                        {product.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        {product.category_name}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                            Price
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-900">
                            {formatCurrency(
                                product.base_price,
                            )}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                            Status
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-900">
                            {product.is_active
                                ? 'Active'
                                : 'Inactive'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const user =
        log.subject_summary as UserSubjectSummary;

    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-blue-50 p-5 text-center">
                <p className="text-lg font-black text-slate-900">
                    {user.name}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                    {user.email}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                        Role
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-900">
                        {formatValue(
                            user.role,
                        )}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                        Status
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-900">
                        {user.is_active
                            ? 'Active'
                            : 'Inactive'}
                    </p>
                </div>
            </div>
        </div>
    );
}

function formatCurrency(
    amount: string,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style: 'currency',
            currency: 'PHP',
        },
    ).format(
        Number(amount),
    );
}

const CARD_META: Record<
    SummaryCardKey,
    { title: string; icon: LucideIcon }
> = {
    total: {
        title: 'Total Logs — By Module',
        icon: FileClock,
    },

    today: {
        title: "Today's Activity — By Module",
        icon: Clock3,
    },

    this_week: {
        title: 'This Week — Daily Activity',
        icon: Clock3,
    },

    active_staff_today: {
        title: 'Active Staff Today',
        icon: UserRound,
    },
};

/*
|--------------------------------------------------------------------------
| Module Breakdown
|--------------------------------------------------------------------------
*/

function ModuleBreakdownList({
    rows,
}: {
    rows: ModuleBreakdownRow[];
}) {
    if (rows.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                No activity recorded yet.
            </p>
        );
    }

    const highest = Math.max(
        ...rows.map((row) => row.count),
    );

    return (
        <div className="space-y-3">
            {rows.map((row) => (
                <div key={row.module}>
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-700">
                            {formatValue(
                                row.module,
                            )}
                        </span>

                        <span className="font-black text-slate-900">
                            {row.count}
                        </span>
                    </div>

                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                                width: `${(row.count / highest) * 100}%`,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Daily Breakdown
|--------------------------------------------------------------------------
*/

function DailyBreakdownList({
    rows,
}: {
    rows: DailyBreakdownRow[];
}) {
    const highest = Math.max(
        1,
        ...rows.map((row) => row.count),
    );

    return (
        <div className="flex items-end justify-between gap-2">
            {rows.map((row) => (
                <div
                    key={row.label}
                    className="flex flex-1 flex-col items-center gap-2"
                >
                    <span className="text-xs font-black text-slate-900">
                        {row.count}
                    </span>

                    <div className="flex h-24 w-full items-end rounded-lg bg-slate-100">
                        <div
                            className={`w-full rounded-lg ${
                                row.is_today
                                    ? 'bg-blue-600'
                                    : 'bg-blue-300'
                            }`}
                            style={{
                                height: `${(row.count / highest) * 100}%`,
                            }}
                        />
                    </div>

                    <span
                        className={`text-[10px] font-bold uppercase ${
                            row.is_today
                                ? 'text-blue-700'
                                : 'text-slate-400'
                        }`}
                    >
                        {row.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Active Staff
|--------------------------------------------------------------------------
*/

function ActiveStaffList({
    rows,
}: {
    rows: ActiveStaffRow[];
}) {
    if (rows.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                No staff activity recorded today.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {rows.map((row) => (
                <div
                    key={row.user_id}
                    className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3"
                >
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                            {row.name
                                ?? 'Unknown Staff'}
                        </p>

                        {row.role && (
                            <p className="text-xs text-slate-500">
                                {formatValue(
                                    row.role,
                                )}
                            </p>
                        )}
                    </div>

                    <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                        {row.action_count}{' '}
                        action
                        {row.action_count === 1
                            ? ''
                            : 's'}
                    </span>
                </div>
            ))}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Audit Row
|--------------------------------------------------------------------------
*/

function AuditLogRow({
    log,
    onViewDetails,
}: {
    log: AuditLogItem;
    onViewDetails: () => void;
}) {
    const actorName =
        log.actor_name
        ?? log.user?.name
        ?? 'System';

    const actorEmail =
        log.actor_email
        ?? log.user?.email
        ?? null;

    const actorRole =
        log.actor_role
        ?? log.user?.role
        ?? null;

    const recordLabel =
        getRecordLabel(
            log.module,
            log.action,
        );

    return (
        <article className="px-5 py-5 sm:px-6">
            <div
                className="
                    rounded-2xl
                    border
                    border-slate-100
                    bg-white
                    p-5
                    transition
                    hover:border-slate-200
                    hover:shadow-sm
                "
            >
                {/* HEADER */}
                <div
                    className="
                        flex
                        flex-col
                        gap-4
                        sm:flex-row
                        sm:items-start
                        sm:justify-between
                    "
                >
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <ActionBadge
                                action={
                                    log.action
                                }
                            />

                            <span
                                className="
                                    rounded-full
                                    bg-blue-50
                                    px-2.5
                                    py-1
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-blue-600
                                "
                            >
                                {formatValue(
                                    log.module,
                                )}
                            </span>
                        </div>

                        <h3 className="mt-3 text-base font-black text-slate-900">
                            {getActivityTitle(
                                log.action,
                                log.module,
                            )}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            {
                                log.description
                            }
                        </p>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <Clock3
                                size={13}
                            />

                            {log.created_at
                                ?? 'Unknown date'}
                        </p>
                    </div>
                </div>

                {/* ACTOR / RECORD INFORMATION */}
                <div
                    className="
                        mt-5
                        grid
                        gap-3
                        rounded-2xl
                        bg-slate-50
                        p-4
                        md:grid-cols-2
                    "
                >
                    <div className="flex items-start gap-3">
                        <div
                            className="
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-100
                                text-blue-700
                            "
                        >
                            <UserRound
                                size={17}
                            />
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                Performed By
                            </p>

                            <p className="mt-1 truncate text-sm font-black text-slate-900">
                                {
                                    actorName
                                }
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                {actorEmail && (
                                    <span>
                                        {
                                            actorEmail
                                        }
                                    </span>
                                )}

                                {actorRole && (
                                    <>
                                        <span className="text-slate-300">
                                            •
                                        </span>

                                        <span>
                                            {formatValue(
                                                actorRole,
                                            )}
                                        </span>
                                    </>
                                )}

                                {log.user_id && (
                                    <>
                                        <span className="text-slate-300">
                                            •
                                        </span>

                                        <span>
                                            User #
                                            {
                                                log.user_id
                                            }
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Related Record
                        </p>

                        {log.subject_id ? (
                            <p className="mt-1 text-sm font-bold text-slate-800">
                                {recordLabel} #
                                {log.subject_id}
                            </p>
                        ) : (
                            <p className="mt-1 text-sm font-bold text-slate-800">
                                No related record
                            </p>
                        )}
                    </div>
                </div>

                {/* DETAILS CONTROL */}
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={
                            onViewDetails
                        }
                        className="
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            px-4
                            py-2
                            text-xs
                            font-bold
                            text-slate-600
                            transition
                            hover:border-blue-200
                            hover:bg-blue-50
                            hover:text-blue-700
                        "
                    >
                        View Details
                    </button>
                </div>
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Changes List
|--------------------------------------------------------------------------
|
| Merges old_values/new_values into a single "field: before → after"
| list instead of two separate columns — avoids making the reader
| match up rows across two lists, and doesn't depend on the popup
| being wide enough for two columns to fit comfortably.
*/

type ChangeRow =
    | {
          key: string;
          kind: 'changed';
          before: string;
          after: string;
      }
    | {
          key: string;
          kind: 'info';
          value: string;
      };

/*
 * Not every key recorded alongside an action is something that
 * "changed" — e.g. a stock receipt logs quantity_on_hand (which
 * really did go from one number to another) alongside receipt
 * number, PO number, product name, etc. (contextual details about
 * the event, which never had a "before" state to compare against).
 * A key only counts as a real change when it exists on BOTH sides
 * with a different value; a key that only ever appears on one side
 * is just recorded detail, shown plainly with no before/after arrow
 * and no "Not set" placeholder.
 */
function buildChangeRows(
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
): ChangeRow[] {
    const old = oldValues ?? {};
    const news = newValues ?? {};

    const keys = Array.from(
        new Set([
            ...Object.keys(old),
            ...Object.keys(news),
        ]),
    );

    return keys
        .map(
            (key): ChangeRow | null => {
                const hasOld =
                    Object.hasOwn(
                        old,
                        key,
                    );

                const hasNew =
                    Object.hasOwn(
                        news,
                        key,
                    );

                if (hasOld && hasNew) {
                    const before =
                        formatAuditValue(
                            key,
                            old[key],
                        );

                    const after =
                        formatAuditValue(
                            key,
                            news[key],
                        );

                    if (before === after) {
                        return null;
                    }

                    return {
                        key,
                        kind: 'changed',
                        before,
                        after,
                    };
                }

                return {
                    key,
                    kind: 'info',
                    value: formatAuditValue(
                        key,
                        hasNew
                            ? news[key]
                            : old[key],
                    ),
                };
            },
        )
        .filter(
            (row): row is ChangeRow =>
                row !== null,
        );
}

function ChangesList({
    oldValues,
    newValues,
}: {
    oldValues: Record<
        string,
        unknown
    > | null;
    newValues: Record<
        string,
        unknown
    > | null;
}) {
    const rows = buildChangeRows(
        oldValues,
        newValues,
    );

    if (rows.length === 0) {
        return (
            <p className="text-sm text-slate-400">
                No field changes recorded
                for this action.
            </p>
        );
    }

    /*
     * Changed rows need the extra width for the before → after
     * arrow, so they stay full-width and stacked. Info-only rows
     * are short one-line facts (e.g. a receipt or PO number), so
     * a 2-column grid fits roughly twice as many on screen at
     * once — keeps most entries readable without scrolling.
     */

    const changedRows = rows.filter(
        (row) => row.kind === 'changed',
    );

    const infoRows = rows.filter(
        (row) => row.kind === 'info',
    );

    return (
        <div className="space-y-2">
            {changedRows.map((row) => (
                <div
                    key={row.key}
                    className="
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        px-4
                        py-3
                    "
                >
                    <p className="text-xs font-bold text-slate-500">
                        {formatValue(
                            row.key,
                        )}
                    </p>

                    <div
                        className="
                            mt-1.5
                            flex
                            flex-wrap
                            items-center
                            gap-2
                            text-sm
                            font-semibold
                        "
                    >
                        <span className="text-slate-500 line-through decoration-slate-300">
                            {
                                row.before
                            }
                        </span>

                        <ArrowRight
                            size={14}
                            className="shrink-0 text-slate-400"
                        />

                        <span className="text-slate-900">
                            {
                                row.after
                            }
                        </span>
                    </div>
                </div>
            ))}

            {infoRows.length > 0 && (
                <div
                    className="
                        grid
                        gap-2
                        sm:grid-cols-2
                    "
                >
                    {infoRows.map(
                        (row) => (
                            <div
                                key={
                                    row.key
                                }
                                className="
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-slate-50
                                    px-4
                                    py-3
                                "
                            >
                                <p className="text-xs font-bold text-slate-500">
                                    {formatValue(
                                        row.key,
                                    )}
                                </p>

                                <p className="mt-1 wrap-break-word text-sm font-semibold text-slate-900">
                                    {
                                        row.value
                                    }
                                </p>
                            </div>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Action Badge
|--------------------------------------------------------------------------
*/

function ActionBadge({
    action,
}: {
    action: string;
}) {
    const style =
        action === 'created'
            ? 'bg-blue-100 text-blue-700'
            : action === 'activated'
              ? 'bg-emerald-100 text-emerald-700'
              : action === 'deactivated'
                ? 'bg-red-100 text-red-700'
                : action === 'password_changed'
                  ? 'bg-violet-100 text-violet-700'
                  : action === 'payment_confirmed'
                    ? 'bg-amber-100 text-amber-700'
                    : action === 'released'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-700';

    return (
        <span
            className={`
                rounded-full
                px-2.5
                py-1
                text-[10px]
                font-black
                uppercase
                tracking-wide
                ${style}
            `}
        >
            {formatValue(
                action,
            )}
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

type SummaryTone =
    | 'slate'
    | 'blue'
    | 'green'
    | 'amber';

function SummaryCard({
    label,
    value,
    tone,
    onClick,
}: {
    label: string;
    value: number;
    tone: SummaryTone;
    onClick?: () => void;
}) {
    const styles = {
        slate:
            'border-slate-200 bg-white text-slate-900',

        blue:
            'border-blue-200 bg-blue-50/60 text-blue-700',

        green:
            'border-emerald-200 bg-emerald-50/60 text-emerald-700',

        amber:
            'border-amber-200 bg-amber-50/60 text-amber-700',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                rounded-2xl
                border
                p-4
                text-left
                shadow-sm
                transition
                hover:-translate-y-0.5
                hover:shadow-md
                ${styles[tone]}
            `}
        >
            <p className="text-xs font-bold text-slate-500">
                {label}
            </p>

            <p className="mt-1 text-2xl font-black">
                {value}
            </p>
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

function PaginationButton({
    disabled,
    onClick,
    children,
}: {
    disabled: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-40
            "
        >
            {children}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Formatting
|--------------------------------------------------------------------------
*/

const ACTIVITY_TITLES: Record<string, string> = {
    'users:activated': 'Account Activated',
    'users:deactivated': 'Account Deactivated',
    'users:created': 'Employee Account Created',
    'users:updated': 'Employee Information Updated',
    'users:password_changed': 'Password Changed',

    'orders:payment_qr_scanned': 'Payment QR Verified',
    'orders:payment_confirmed': 'Payment Confirmed',
    'orders:release_qr_scanned': 'Release QR Verified',
    'orders:ready_for_pickup': 'Marked Ready for Pickup',
    'orders:released': 'Order Released to Student',

    'inventory:inventory_adjusted': 'Inventory Quantity Adjusted',
    'inventory:stock_received': 'Stock Received',

    'products:variant_created': 'Product Variant Created',
    'products:variant_activated': 'Variant Activated',
    'products:variant_deactivated': 'Variant Deactivated',
    'products:created': 'Product Created',
    'products:updated': 'Product Updated',

    'categories:created': 'Category Created',
    'categories:updated': 'Category Updated',

    'purchase_orders:created': 'Purchase Order Created',
    'purchase_orders:archived': 'Purchase Order Archived',
    'purchase_orders:restored': 'Purchase Order Restored',
};

/*
 * Falls back to a generic "Module — Action" title for anything not
 * in the map above, so a newly-logged action never renders blank.
 */
function getActivityTitle(
    action: string,
    module: string,
): string {
    return (
        ACTIVITY_TITLES[
            `${module}:${action}`
        ]
        ?? `${formatValue(
            module,
        )} — ${formatValue(
            action,
        )}`
    );
}

function getRecordLabel(
    module: string,
    action: string,
): string {
    /*
     * "products" covers two different subjects: variant-level
     * actions (variant_created, ...) point at a ProductVariant,
     * while created/updated point at the Product itself.
     */
    if (module === 'products') {
        return action.startsWith('variant_')
            ? 'Variant ID'
            : 'Product ID';
    }

    const labels:
        Record<string, string> = {
            users:
                'Account ID',

            orders:
                'Order ID',

            categories:
                'Category ID',

            inventory:
                'Inventory Record',

            purchase_orders:
                'Purchase Order ID',
        };

    return labels[module]
        ?? 'Record';
}


function formatValue(
    value: string,
): string {
    const labels:
        Record<string, string> = {
            is_active:
                'Account Status',

            employee_id:
                'Employee ID',

            user_id:
                'User ID',

            supervisor_id:
                'Supervisor',

            position_id:
                'Position',

            quantity_before:
                'Quantity Before',

            quantity_after:
                'Quantity After',

            quantity_on_hand:
                'Quantity On Hand',

            verified_by:
                'Verified By (User ID)',

            purchase_order_id:
                'Purchase Order ID',

            purchase_order_item_id:
                'Purchase Order Item ID',

            receiving_mode:
                'Receiving Mode',

            receipt_number:
                'Receipt Number',

            must_change_password:
                'Must Change Password',

            payment_reference:
                'Payment Reference',

            payment_method:
                'Payment Method',

            payment_status:
                'Payment Status',

            paid_at:
                'Paid At',

            payment_qr_used_at:
                'Payment QR Verified At',
        };

    if (labels[value]) {
        return labels[value];
    }

    return value
        .replace(
            /_/g,
            ' ',
        )
        .replace(
            /\b\w/g,
            (
                character,
            ) =>
                character.toUpperCase(),
        );
}

function formatAuditValue(
    key: string,
    value: unknown,
): string {
    if (
        value === null
        || value === undefined
    ) {
        return 'Not set';
    }

    /*
    |--------------------------------------------------------------------------
    | Account Status
    |--------------------------------------------------------------------------
    */

    if (
        key === 'is_active'
        && typeof value ===
            'boolean'
    ) {
        return value
            ? 'Active'
            : 'Inactive';
    }

    /*
    |--------------------------------------------------------------------------
    | Other Boolean Values
    |--------------------------------------------------------------------------
    */

    if (
        typeof value ===
        'boolean'
    ) {
        return value
            ? 'Yes'
            : 'No';
    }

    /*
    |--------------------------------------------------------------------------
    | Timestamps
    |--------------------------------------------------------------------------
    |
    | Stored as raw "Y-m-d H:i:s" strings — shown in the same
    | readable format used everywhere else in PROWARE.
    */

    if (
        typeof value === 'string'
        && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(
            value,
        )
    ) {
        const parsed = new Date(
            value.replace(' ', 'T'),
        );

        if (! Number.isNaN(parsed.getTime())) {
            return new Intl.DateTimeFormat(
                'en-PH',
                {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                },
            ).format(parsed);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Structured Values
    |--------------------------------------------------------------------------
    */

    if (
        typeof value ===
        'object'
    ) {
        return JSON.stringify(
            value,
        );
    }

    return String(
        value,
    );
}