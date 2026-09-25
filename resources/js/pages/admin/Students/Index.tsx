import {
    Head,
    Link,
    router,
} from '@inertiajs/react';
import {
    CheckCircle2,
    CircleOff,
    GraduationCap,
    Search,
    UserRound,
    UserRoundCheck,
    UserRoundX,
    Users,
} from 'lucide-react';


import {
    
    useState
} from 'react';
import type {FormEvent} from 'react';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';

import AdminLayout from '@/layouts/AdminLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface StudentRow {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    student_id: string | null;
    course: string | null;
    year_level: string | null;
    status: string | null;
    registered_at: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface StudentPagination {
    data: StudentRow[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

interface StudentSummary {
    total: number;
    active: number;
    inactive: number;
    registered_today: number;
}

interface FilterData {
    search: string;
    status: string;
}

interface PageProps {
    students: StudentPagination;
    summary: StudentSummary;
    filters: FilterData;
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Index({
    students,
    summary,
    filters,
}: PageProps) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);

    const {
        processing,
        notification,
        startProcessing,
        showSuccess,
        showError,
        clearNotification,
    } = useActionFeedback();

    const [confirmTarget, setConfirmTarget] = useState<{
        student: StudentRow;
        action: 'activate' | 'deactivate';
    } | null>(null);

    const applyFilters = (
        nextSearch: string,
        nextStatus: string,
    ): void => {
        router.get(
            '/admin/students',
            {
                search: nextSearch.trim() || undefined,
                status: nextStatus !== 'all' ? nextStatus : undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        applyFilters(search, status);
    };

    const changeStatus = (nextStatus: string): void => {
        setStatus(nextStatus);
        applyFilters(search, nextStatus);
    };

    const confirmAction = (): void => {
        if (!confirmTarget || processing) {
            return;
        }

        const { student, action } = confirmTarget;

        startProcessing();

        router.patch(
            `/admin/users/${student.id}/${action}`,
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setConfirmTarget(null);

                    showSuccess(
                        action === 'activate'
                            ? `${student.name}'s account was activated successfully.`
                            : `${student.name}'s account was deactivated successfully.`,
                    );
                },

                onError: () => {
                    setConfirmTarget(null);

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
        <AdminLayout>
            <Head title="Students" />

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}

            <div className="mx-auto max-w-7xl space-y-7">
                {/* Header */}
                <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-black tracking-wide text-blue-600 uppercase">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            Students
                        </h1>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Every account created through student
                            self-registration. There&apos;s no Microsoft 365
                            verification yet, so this is where you can review
                            who has registered and deactivate an account if
                            something looks wrong.
                        </p>
                    </div>
                </section>

                {/* Summary */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Total Students"
                        value={summary.total}
                        description="All self-registered accounts"
                        icon={Users}
                    />

                    <SummaryCard
                        title="Active"
                        value={summary.active}
                        description="Accounts that can currently log in"
                        icon={UserRoundCheck}
                        tone="green"
                    />

                    <SummaryCard
                        title="Inactive"
                        value={summary.inactive}
                        description="Deactivated accounts"
                        icon={UserRoundX}
                        tone="red"
                    />

                    <SummaryCard
                        title="Registered Today"
                        value={summary.registered_today}
                        description="New accounts created today"
                        icon={GraduationCap}
                        tone="blue"
                    />
                </section>

                {/* Search + Filters */}
                <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="font-black text-slate-900">
                                Registered Students
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {students.total} student
                                {students.total === 1 ? '' : 's'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <form
                                onSubmit={submitSearch}
                                className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto"
                            >
                                <div className="relative w-full sm:w-80">
                                    <Search
                                        size={18}
                                        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Search name, email, or Student ID..."
                                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                                >
                                    Search
                                </button>
                            </form>

                            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                                <StatusButton
                                    active={status === 'all'}
                                    onClick={() => changeStatus('all')}
                                >
                                    All
                                </StatusButton>

                                <StatusButton
                                    active={status === 'active'}
                                    onClick={() => changeStatus('active')}
                                >
                                    Active
                                </StatusButton>

                                <StatusButton
                                    active={status === 'inactive'}
                                    onClick={() => changeStatus('inactive')}
                                >
                                    Inactive
                                </StatusButton>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Table */}
                {students.data.length > 0 ? (
                    <>
                        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-slate-100 bg-slate-50 text-left">
                                        <tr>
                                            <TableHeading>Student</TableHeading>
                                            <TableHeading>
                                                Course / Year
                                            </TableHeading>
                                            <TableHeading>
                                                Registered
                                            </TableHeading>
                                            <TableHeading>Status</TableHeading>
                                            <TableHeading>Action</TableHeading>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {students.data.map((student) => (
                                            <StudentTableRow
                                                key={student.id}
                                                student={student}
                                                onToggle={() =>
                                                    setConfirmTarget({
                                                        student,
                                                        action:
                                                            student.is_active
                                                                ? 'deactivate'
                                                                : 'activate',
                                                    })
                                                }
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <Pagination links={students.links} />
                    </>
                ) : (
                    <EmptyState hasSearch={filters.search !== ''} />
                )}
            </div>

            <ActionConfirmModal
                open={confirmTarget !== null}
                title={
                    confirmTarget?.action === 'activate'
                        ? 'Activate Account'
                        : 'Deactivate Account'
                }
                message={
                    confirmTarget
                        ? confirmTarget.action === 'activate'
                            ? `${confirmTarget.student.name} will be able to log in again.`
                            : `${confirmTarget.student.name} will no longer be able to log in.`
                        : ''
                }
                confirmText={
                    confirmTarget?.action === 'activate'
                        ? 'Activate'
                        : 'Deactivate'
                }
                processing={processing}
                tone={
                    confirmTarget?.action === 'deactivate'
                        ? 'danger'
                        : 'primary'
                }
                onCancel={() => setConfirmTarget(null)}
                onConfirm={confirmAction}
            />
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

type SummaryTone = 'slate' | 'green' | 'red' | 'blue';

const SUMMARY_TONES: Record<
    SummaryTone,
    { card: string; icon: string; value: string }
> = {
    slate: {
        card: 'border-slate-100',
        icon: 'bg-slate-100 text-slate-600',
        value: 'text-slate-900',
    },
    green: {
        card: 'border-emerald-100',
        icon: 'bg-emerald-100 text-emerald-700',
        value: 'text-emerald-700',
    },
    red: {
        card: 'border-red-100',
        icon: 'bg-red-100 text-red-700',
        value: 'text-red-700',
    },
    blue: {
        card: 'border-blue-100',
        icon: 'bg-blue-100 text-blue-700',
        value: 'text-blue-700',
    },
};

function SummaryCard({
    title,
    value,
    description,
    icon: Icon,
    tone = 'slate',
}: {
    title: string;
    value: number;
    description: string;
    icon: typeof Users;
    tone?: SummaryTone;
}) {
    const style = SUMMARY_TONES[tone];

    return (
        <article
            className={`rounded-3xl border bg-white p-5 shadow-sm ${style.card}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black tracking-wide text-slate-400 uppercase">
                        {title}
                    </p>

                    <p className={`mt-3 text-3xl font-black ${style.value}`}>
                        {value}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        {description}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
                >
                    <Icon size={20} />
                </div>
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Status Filter Button
|--------------------------------------------------------------------------
*/

function StatusButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                active
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
            }`}
        >
            {children}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Table Heading
|--------------------------------------------------------------------------
*/

function TableHeading({ children }: { children: string }) {
    return (
        <th className="px-5 py-4 text-xs font-black tracking-wide text-slate-500 uppercase">
            {children}
        </th>
    );
}

/*
|--------------------------------------------------------------------------
| Student Row
|--------------------------------------------------------------------------
*/

function StudentTableRow({
    student,
    onToggle,
}: {
    student: StudentRow;
    onToggle: () => void;
}) {
    return (
        <tr className="align-top transition hover:bg-slate-50/70">
            <td className="px-5 py-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <UserRound size={17} />
                    </div>

                    <div className="min-w-0">
                        <p className="font-black text-slate-900">
                            {student.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                            {student.email}
                        </p>

                        <p className="mt-1 font-mono text-[11px] text-slate-400">
                            {student.student_id ?? 'N/A'}
                        </p>
                    </div>
                </div>
            </td>

            <td className="px-5 py-5">
                <p className="text-sm font-bold text-slate-800">
                    {student.course ?? '—'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                    {student.year_level
                        ? `Year ${student.year_level}`
                        : '—'}
                </p>
            </td>

            <td className="px-5 py-5">
                <p className="text-sm whitespace-nowrap text-slate-600">
                    {student.registered_at ?? '—'}
                </p>
            </td>

            <td className="px-5 py-5">
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${
                        student.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                >
                    {student.is_active ? (
                        <CheckCircle2 size={13} />
                    ) : (
                        <CircleOff size={13} />
                    )}
                    {student.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>

            <td className="px-5 py-5">
                <button
                    type="button"
                    onClick={onToggle}
                    className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-black transition ${
                        student.is_active
                            ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
                    }`}
                >
                    {student.is_active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
    );
}

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
    return (
        <section className="rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
            <GraduationCap size={42} className="mx-auto text-slate-300" />

            <h2 className="mt-5 text-xl font-black text-slate-800">
                {hasSearch ? 'No matching students' : 'No students registered yet'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {hasSearch
                    ? 'Try another name, email, or Student ID.'
                    : 'Students will appear here once they register through the Student Registration page.'}
            </p>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <div className="flex flex-wrap justify-center gap-2 rounded-3xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
            {links.map((link, index) => {
                const label = link.label
                    .replace('&laquo;', '«')
                    .replace('&raquo;', '»');

                if (!link.url) {
                    return (
                        <span
                            key={index}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-300"
                        >
                            {label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                            link.active
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}
