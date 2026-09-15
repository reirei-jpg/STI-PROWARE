import {
    ChevronLeft,
    ChevronRight,
    Clock3,
    FileClock,
    Search,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

import {
    Head,
    router,
} from '@inertiajs/react';

import {
    useEffect,
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';

interface AuditUser {
    id: number;
    name: string;
    email: string;
    role: string;
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
    old_values: Record<
        string,
        unknown
    > | null;
    new_values: Record<
        string,
        unknown
    > | null;
    ip_address: string | null;
    user_agent: string | null;
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
    users: number;
    authentication: number;
}

interface AuditFilters {
    search: string;
    module: string;
    action: string;
}

interface AuditLogsPageProps {
    logs: PaginatedLogs;
    summary: AuditSummary;
    filters: AuditFilters;
    modules: string[];
    actions: string[];
}

export default function Index({
    logs,
    summary,
    filters,
    modules,
    actions,
}: AuditLogsPageProps) {
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
                    />

                    <SummaryCard
                        label="Today"
                        value={
                            summary.today
                        }
                        tone="blue"
                    />

                    <SummaryCard
                        label="User Actions"
                        value={
                            summary.users
                        }
                        tone="green"
                    />

                    <SummaryCard
                        label="Authentication"
                        value={
                            summary.authentication
                        }
                        tone="amber"
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
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Audit Row
|--------------------------------------------------------------------------
*/

function AuditLogRow({
    log,
}: {
    log: AuditLogItem;
}) {
    const [
        expanded,
        setExpanded,
    ] = useState(false);

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

                        <p className="mt-1 text-sm font-bold text-slate-800">
                            {log.subject_id
                                ? `${recordLabel} #${log.subject_id}`
                                : 'No related record'}
                        </p>

                        {log.ip_address && (
                            <p className="mt-1 text-xs text-slate-500">
                                IP Address:{' '}
                                {
                                    log.ip_address
                                }
                            </p>
                        )}
                    </div>
                </div>

                {/* DETAILS CONTROL */}
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={() =>
                            setExpanded(
                                (current) =>
                                    !current,
                            )
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
                        {expanded
                            ? 'Hide Details'
                            : 'View Details'}
                    </button>
                </div>

                {/* CHANGE DETAILS */}
                {expanded && (
                    <div
                        className="
                            mt-4
                            rounded-2xl
                            border
                            border-slate-200
                            bg-slate-50
                            p-4
                        "
                    >
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Changes Made
                        </p>

                        <div
                            className="
                                mt-3
                                grid
                                gap-4
                                lg:grid-cols-2
                            "
                        >
                            <AuditValues
                                title="Before"
                                values={
                                    log.old_values
                                }
                            />

                            <AuditValues
                                title="After"
                                values={
                                    log.new_values
                                }
                            />
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Audit Values
|--------------------------------------------------------------------------
*/

function AuditValues({
    title,
    values,
}: {
    title: string;
    values: Record<
        string,
        unknown
    > | null;
}) {
    return (
        <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                {title}
            </p>

            {values
            && Object.keys(values)
                .length > 0 ? (
                <dl className="mt-3 space-y-2">
                    {Object.entries(
                        values,
                    ).map(
                        ([
                            key,
                            value,
                        ]) => (
                            <div
                                key={key}
                                className="
                                    flex
                                    items-start
                                    justify-between
                                    gap-4
                                    rounded-xl
                                    bg-white
                                    px-3
                                    py-2
                                "
                            >
                                <dt className="text-xs font-bold text-slate-500">
                                    {formatValue(
                                        key,
                                    )}
                                </dt>

                                <dd className="break-all text-right text-xs font-semibold text-slate-800">
                                    {formatAuditValue(
                                        key,
                                        value,
                                    )}
                                </dd>
                            </div>
                        ),
                    )}
                </dl>
            ) : (
                <p className="mt-3 text-xs text-slate-400">
                    No values recorded.
                </p>
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
}: {
    label: string;
    value: number;
    tone: SummaryTone;
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
        <article
            className={`
                rounded-2xl
                border
                p-4
                shadow-sm
                ${styles[tone]}
            `}
        >
            <p className="text-xs font-bold text-slate-500">
                {label}
            </p>

            <p className="mt-1 text-2xl font-black">
                {value}
            </p>
        </article>
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

function getActivityTitle(
    action: string,
    module: string,
): string {
    if (
        module === 'users'
    ) {
        if (
            action ===
            'activated'
        ) {
            return 'Account Activated';
        }

        if (
            action ===
            'deactivated'
        ) {
            return 'Account Deactivated';
        }

        if (
            action ===
            'created'
        ) {
            return 'Employee Account Created';
        }

        if (
            action ===
            'updated'
        ) {
            return 'Employee Information Updated';
        }

        if (
            action ===
            'password_changed'
        ) {
            return 'Password Changed';
        }
    }

    return `${formatValue(
        module,
    )} — ${formatValue(
        action,
    )}`;
}

function getRecordLabel(
    module: string,
): string {
    const labels:
        Record<string, string> = {
            users:
                'Account ID',

            orders:
                'Order ID',

            products:
                'Product ID',

            inventory:
                'Inventory Record',

            authentication:
                'Account',
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