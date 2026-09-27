
import {
    Head,
    Link,
    router,
} from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleOff,
    MoreVertical,
    Search,
    UserRound,
    Users,
    Plus,
} from 'lucide-react';

import {
    useEffect,
    useRef,
    useState,
} from 'react';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import AdminLayout from '@/layouts/AdminLayout';

interface SupervisorInfo {
    id: number;
    name: string | null;
    employee_id: string | null;
    position: string | null;
}

interface StaffInfo {
    id: number;
    employee_id: string | null;
    position: string | null;
    position_id: number | null;
    position_level: number | null;
    is_supervisory: boolean;
    supervisor: SupervisorInfo | null;
}

interface SystemUser {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    is_locked: boolean;
    staff: StaffInfo | null;
    created_at: string | null;
}

interface PaginatedUsers {
    current_page: number;
    data: SystemUser[];
    from: number | null;
    last_page: number;
    next_page_url: string | null;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

interface UserSummary {
    total: number;
    cashiers: number;
    specialists: number;
    admins: number;
    active_accounts: number;
    inactive_accounts: number;
}

type RoleFilter =
    | 'all'
    | 'cashier'
    | 'specialist'
    | 'admin';

type StatusFilter =
    | 'all'
    | 'active'
    | 'inactive';

interface UserFilters {
    search: string;
    role: RoleFilter;
    status: StatusFilter;
}

interface UsersPageProps {
    users: PaginatedUsers;
    summary: UserSummary;
    filters: UserFilters;

    flash?: {
        success?: string | null;
        error?: string | null;
    };
}

export default function Index({
    users,
    summary,
    filters,
    flash,
}: UsersPageProps) {
    const [
        search,
        setSearch,
    ] = useState(
        filters.search ?? '',
    );

    const currentRole =
        filters.role ?? 'all';

    const currentStatus =
        filters.status ?? 'all';

const {
    notification,
    showSuccess,
    showError,
    clearNotification,
} = useActionFeedback();

useEffect(() => {
    if (flash?.success) {
        showSuccess(
            flash.success,
        );

        return;
    }

    if (flash?.error) {
        showError(
            flash.error,
        );
    }
}, [
    flash?.success,
    flash?.error,
]);



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
                        '/admin/users',
                        {
                            search:
                                normalized
                                || undefined,

                            role:
                                currentRole ===
                                'all'
                                    ? undefined
                                    : currentRole,

                            status:
                                currentStatus ===
                                'all'
                                    ? undefined
                                    : currentStatus,
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
        currentRole,
        currentStatus,
    ]);

    const applyFilters = (
        role: RoleFilter,
        status: StatusFilter,
    ): void => {
        router.get(
            '/admin/users',
            {
                search:
                    search.trim()
                    || undefined,

                role:
                    role === 'all'
                        ? undefined
                        : role,

                status:
                    status === 'all'
                        ? undefined
                        : status,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const changeRole = (
        role: RoleFilter,
    ): void =>
        applyFilters(
            role,
            currentStatus,
        );

    const changeStatus = (
        status: StatusFilter,
    ): void =>
        applyFilters(
            currentRole,
            status,
        );

    const resetFilters = (): void =>
        applyFilters(
            'all',
            'all',
        );

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

    return (
        <AdminLayout>
            <Head title="Users" />

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
                            User Management
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Review and manage Cashier,
                            Specialist, and Admin access
                            to PROWARE. Student accounts
                            are managed separately under
                            Students.
                        </p>
                    </div>

                    <div
    className="
        flex
        w-full
        flex-col
        gap-3
        sm:flex-row
        lg:w-auto
    "
>
    <div className="relative w-full sm:w-80">
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
            onChange={(event) =>
                setSearch(
                    event.target.value,
                )
            }
            placeholder="Search accounts..."
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

    <Link
        href="/admin/users/create"
        className="
            inline-flex
            shrink-0
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-[#0D6EFD]
            px-5
            py-3
            text-sm
            font-black
            text-white
            transition
            hover:bg-blue-700
        "
    >
        <Plus size={18} />

        Create Staff
    </Link>
</div>
                </section>

                {/* ACCOUNT SUMMARY */}
                <section
                    className="
                        grid
                        gap-3
                        sm:grid-cols-2
                        lg:grid-cols-3
                    "
                >
                    <SummaryCard
                        label="Total Accounts"
                        value={summary.total}
                        tone="slate"
                        active={
                            currentRole === 'all'
                            && currentStatus === 'all'
                        }
                        onClick={resetFilters}
                    />

                    <SummaryCard
                        label="Active Accounts"
                        value={
                            summary
                                .active_accounts
                        }
                        tone="green"
                        active={
                            currentStatus === 'active'
                        }
                        onClick={() =>
                            changeStatus('active')
                        }
                    />

                    <SummaryCard
                        label="Disabled Accounts"
                        value={
                            summary
                                .inactive_accounts
                        }
                        tone="red"
                        active={
                            currentStatus === 'inactive'
                        }
                        onClick={() =>
                            changeStatus('inactive')
                        }
                    />
                </section>

                {/* ROLE FILTERS */}
                <section
                    className="
                        flex
                        flex-wrap
                        gap-2
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-3
                        shadow-sm
                    "
                >
                    <RoleFilterButton
                        label="All"
                        count={summary.total}
                        active={
                            currentRole ===
                            'all'
                        }
                        onClick={() =>
                            changeRole('all')
                        }
                    />

                    <RoleFilterButton
                        label="Cashiers"
                        count={
                            summary.cashiers
                        }
                        active={
                            currentRole ===
                            'cashier'
                        }
                        onClick={() =>
                            changeRole(
                                'cashier',
                            )
                        }
                    />

                    <RoleFilterButton
                        label="Specialists"
                        count={
                            summary.specialists
                        }
                        active={
                            currentRole ===
                            'specialist'
                        }
                        onClick={() =>
                            changeRole(
                                'specialist',
                            )
                        }
                    />

                    <RoleFilterButton
                        label="Admins"
                        count={
                            summary.admins
                        }
                        active={
                            currentRole ===
                            'admin'
                        }
                        onClick={() =>
                            changeRole(
                                'admin',
                            )
                        }
                    />
                </section>


                {/* USERS LIST */}
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
                                Accounts
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                {users.total}{' '}
                                account
                                {users.total === 1
                                    ? ''
                                    : 's'}
                            </p>
                        </div>

                        <Users
                            size={20}
                            className="text-blue-600"
                        />
                    </div>

                    {users.data.length >
                    0 ? (
                        <>
                            <div className="divide-y divide-slate-100">
                                {users.data.map(
                                    (user) => (
                                        <UserRow
                                            key={
                                                user.id
                                            }
                                            user={
                                                user
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
                                        {users.from
                                            ?? 0}
                                    </strong>
                                    {' '}to{' '}
                                    <strong>
                                        {users.to
                                            ?? 0}
                                    </strong>
                                    {' '}of{' '}
                                    <strong>
                                        {
                                            users.total
                                        }
                                    </strong>
                                </p>

                                <div className="flex items-center gap-2">
                                    <PaginationButton
                                        disabled={
                                            !users
                                                .prev_page_url
                                        }
                                        onClick={() =>
                                            visitPage(
                                                users
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
                                            users.current_page
                                        }
                                        {' / '}
                                        {
                                            users.last_page
                                        }
                                    </span>

                                    <PaginationButton
                                        disabled={
                                            !users
                                                .next_page_url
                                        }
                                        onClick={() =>
                                            visitPage(
                                                users
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
                            <UserRound
                                size={40}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-4 font-black text-slate-800">
                                No users found
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Try changing the search
                                or role filter.
                            </p>
                        </div>
                    )}
                </section>
            
            </div>

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| User Row
|--------------------------------------------------------------------------
*/

function UserRow({
    user,
}: {
    user: SystemUser;
}) {
    return (
        <div
            className="
                grid
                gap-4
                px-5
                py-5
                transition
                hover:bg-slate-50/60
                sm:px-6
                lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto]
                lg:items-center
            "
        >
            {/* IDENTITY */}
            <div className="flex min-w-0 items-center gap-3">
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
                        text-sm
                        font-black
                        text-blue-600
                    "
                >
                    {getInitials(
                        user.name,
                    )}
                </div>

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black text-slate-900">
                            {user.name}
                        </p>

                        <RoleBadge
                            role={
                                user.role
                            }
                        />
                    </div>

                    <p className="mt-1 truncate text-xs text-slate-500">
                        {user.email}
                    </p>
                </div>
            </div>

            {/* PROFILE DETAILS */}
            <div>
                {user.staff ? (
                    <div>
                        <p className="text-sm font-bold text-slate-700">
                            {user.staff.position
                                ?? formatRole(user.role)}
                        </p>

                        <p className="mt-1 font-mono text-xs text-slate-400">
                            {user.staff.employee_id
                                ?? `Staff #${user.staff.id}`}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                            Reports To:{' '}
                            <span className="font-bold text-slate-700">
                                {user.staff.supervisor?.name
                                    ?? 'No supervisor'}
                            </span>
                        </p>

                        {user.staff.supervisor?.position && (
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                {user.staff.supervisor.position}
                            </p>
                        )}
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-medium text-slate-600">
                            {formatRole(
                                user.role,
                            )}{' '}
                            Account
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                            No additional profile
                        </p>
                    </div>
                )}
            </div>

            {/* STATUS + MENU */}
            <div
                className="
                    flex
                    items-center
                    gap-3
                    lg:justify-end
                "
            >
                <CompactAccountStatus
                    active={
                        user.is_active
                    }
                    locked={
                        user.is_locked
                    }
                />

                <AccountActions
                    user={user}
                />
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Account Actions
|--------------------------------------------------------------------------
*/

function AccountActions({
    user,
}: {
    user: SystemUser;
}) {
    const [
        open,
        setOpen,
    ] = useState(false);

    const [
        openUpward,
        setOpenUpward,
    ] = useState(false);

    const [
        pendingAction,
        setPendingAction,
    ] = useState<
        'activate'
        | 'deactivate'
        | null
    >(null);

    const {
    processing,
    notification,
    startProcessing,
    showSuccess,
    showError,
    clearNotification,
} = useActionFeedback();

    const menuRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const handleToggleMenu =
        (): void => {
            if (!open && menuRef.current) {
                const rect =
                    menuRef.current.getBoundingClientRect();

                const estimatedMenuHeight =
                    user.staff
                        ? 220
                        : 165;

                const spaceBelow =
                    window.innerHeight
                    - rect.bottom;

                const spaceAbove =
                    rect.top;

                setOpenUpward(
                    spaceBelow
                    < estimatedMenuHeight
                    && spaceAbove
                    > spaceBelow,
                );
            }

            setOpen(
                (current) =>
                    !current,
            );
        };

    useEffect(() => {
        const handleClickOutside = (
            event: MouseEvent,
        ): void => {
            if (
                menuRef.current
                && !menuRef.current.contains(
                    event.target as Node,
                )
            ) {
                setOpen(false);
            }
        };

        document.addEventListener(
            'mousedown',
            handleClickOutside,
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside,
            );
        };
    }, []);


   const requestAction = (
    action:
        | 'activate'
        | 'deactivate',
): void => {
    if (processing) {
        return;
    }

    startProcessing();

    router.patch(
        `/admin/users/${user.id}/${action}`,
        {},
        {
            preserveScroll: true,

            onSuccess: () => {
                setPendingAction(null);

                showSuccess(
                    action === 'activate'
                        ? `${user.name}'s account was activated successfully.`
                        : `${user.name}'s account was deactivated successfully.`,
                );
            },

            onError: () => {
                showError(
                    action === 'activate'
                        ? 'Account activation failed.'
                        : 'Account deactivation failed.',
                );
            },
        },
    );
};


    return (
        <>
            <div
                ref={menuRef}
                className="relative"
            >
                <button
                    type="button"
                    onClick={
                        handleToggleMenu
                    }
                    aria-label={`Manage ${user.name}`}
                    title="Account actions"
                    disabled={processing}
                    className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        text-slate-500
                        transition
                        hover:border-blue-200
                        hover:bg-blue-50
                        hover:text-blue-600
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >
                    <MoreVertical
                        size={17}
                    />
                </button>

                {open && (
                    <div
                        className={`
                            absolute
                            right-0
                            z-40
                            w-64
                            overflow-hidden
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            shadow-xl

                            ${
                                openUpward
                                    ? 'bottom-11'
                                    : 'top-11'
                            }
                        `}
                    >
                        <div
                            className="
                                border-b
                                border-slate-100
                                px-4
                                py-4
                            "
                        >
                            <p className="truncate text-sm font-black text-slate-900">
                                {user.name}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-400">
                                {user.email}
                            </p>

                            <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-500">
                                    Account Status
                                </span>

                                <CompactAccountStatus
                                    active={
                                        user.is_active
                                    }
                                    locked={
                                        user.is_locked
                                    }
                                />
                            </div>
                        </div>

                        <div className="p-2">
                            {user.staff && (
                                <Link
                                    href={`/admin/users/${user.id}/edit`}
                                    onClick={() =>
                                        setOpen(false)
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        rounded-xl
                                        px-3
                                        py-2.5
                                        text-left
                                        text-sm
                                        font-bold
                                        text-blue-600
                                        transition
                                        hover:bg-blue-50
                                    "
                                >
                                    <div>
                                        <p>
                                            Edit Employee
                                        </p>

                                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                            Update staff information
                                        </p>
                                    </div>
                                </Link>
                            )}

                            {user.is_active ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpen(false);
                                        setPendingAction(
                                            'deactivate',
                                        );
                                    }}
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        rounded-xl
                                        px-3
                                        py-2.5
                                        text-left
                                        text-sm
                                        font-bold
                                        text-red-600
                                        transition
                                        hover:bg-red-50
                                    "
                                >
                                    <CircleOff
                                        size={17}
                                    />

                                    <div>
                                        <p>
                                            Deactivate Account
                                        </p>

                                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                            Block login access
                                        </p>
                                    </div>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpen(false);
                                        setPendingAction(
                                            'activate',
                                        );
                                    }}
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        rounded-xl
                                        px-3
                                        py-2.5
                                        text-left
                                        text-sm
                                        font-bold
                                        text-emerald-600
                                        transition
                                        hover:bg-emerald-50
                                    "
                                >
                                    <CheckCircle2
                                        size={17}
                                    />

                                    <div>
                                        <p>
                                            Activate Account
                                        </p>

                                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                            Restore login access
                                        </p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ActionConfirmModal
    open={pendingAction !== null}
    title={
        pendingAction === 'activate'
            ? 'Activate Account?'
            : 'Deactivate Account?'
    }
    message={
        pendingAction === 'activate'
            ? `Restore PROWARE login access for ${user.name}?`
            : `${user.name} will no longer be able to log in to PROWARE until this account is activated again.`
    }
    confirmText={
        pendingAction === 'activate'
            ? 'Activate'
            : 'Deactivate'
    }
    processingText={
        pendingAction === 'activate'
            ? 'Activating...'
            : 'Deactivating...'
    }
    processing={processing}
    tone={
        pendingAction === 'deactivate'
            ? 'danger'
            : 'primary'
    }
    onCancel={() =>
        setPendingAction(null)
    }
    onConfirm={() => {
        if (pendingAction) {
            requestAction(
                pendingAction,
            );
        }
    }}
/>
            {notification && (
        <ActionNotification
            type={notification.type}
            message={
                notification.message
            }
            onClose={
                clearNotification
            }
                />
        )}

        </>
    );
}

/*
|--------------------------------------------------------------------------
| Account Actions Requests
|--------------------------------------------------------------------------
*/

// No separate activateUser() or deactivateUser()
// functions are needed anymore.



/*
|--------------------------------------------------------------------------
| Compact Status
|--------------------------------------------------------------------------
*/

function CompactAccountStatus({
    active,
    locked = false,
}: {
    active: boolean;
    locked?: boolean;
}) {
    return (
        <div
            className="
                inline-flex
                items-center
                gap-2
                text-xs
                font-bold
            "
        >
            <span
                className={`
                    h-2.5
                    w-2.5
                    rounded-full

                    ${
                        locked
                            ? 'bg-amber-500'
                            : active
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                    }
                `}
            />

            <span
                className={
                    locked
                        ? 'text-amber-700'
                        : active
                          ? 'text-emerald-700'
                          : 'text-red-700'
                }
            >
                {locked
                    ? 'Locked (Security)'
                    : active
                      ? 'Active'
                      : 'Disabled'}
            </span>
        </div>
    );
}


/*
|--------------------------------------------------------------------------
| Role Badge
|--------------------------------------------------------------------------
*/

function RoleBadge({
    role,
}: {
    role: string;
}) {
    const style =
        role === 'admin'
            ? 'bg-violet-100 text-violet-700'
            : role === 'specialist'
              ? 'bg-emerald-100 text-emerald-700'
              : role === 'cashier'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700';

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
            {formatRole(role)}
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
    | 'red';

function SummaryCard({
    label,
    value,
    tone,
    active = false,
    onClick,
}: {
    label: string;
    value: number;
    tone: SummaryTone;
    active?: boolean;
    onClick?: () => void;
}) {
    const styles = {
        slate:
            'border-slate-200 bg-white text-slate-900',

        blue:
            'border-blue-200 bg-blue-50/60 text-blue-700',

        green:
            'border-emerald-200 bg-emerald-50/60 text-emerald-700',

        red:
            'border-red-200 bg-red-50/60 text-red-700',
    };

    const ringStyles = {
        slate: 'ring-slate-400',
        blue: 'ring-blue-500',
        green: 'ring-emerald-500',
        red: 'ring-red-500',
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
                ${active ? `ring-2 ${ringStyles[tone]}` : ''}
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
| Role Filter
|--------------------------------------------------------------------------
*/

function RoleFilterButton({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                inline-flex
                items-center
                gap-2
                rounded-xl
                px-3.5
                py-2.5
                text-xs
                font-bold
                transition

                ${
                    active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
            `}
        >
            {label}

            <span
                className={`
                    rounded-full
                    px-2
                    py-0.5
                    text-[10px]
                    font-black

                    ${
                        active
                            ? 'bg-white/20'
                            : 'bg-white'
                    }
                `}
            >
                {count}
            </span>
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

function getInitials(
    name: string,
): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map(
            (part) =>
                part.charAt(0),
        )
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function formatRole(
    role: string,
): string {
    return role
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