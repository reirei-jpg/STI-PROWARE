import {
    Head,
    Link,
    useForm,
} from '@inertiajs/react';

import {
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type StaffRole =
    | 'admin'
    | 'specialist'
    | 'cashier';

interface PositionOption {
    id: number;
    name: string;
    role: StaffRole;
    level: number;
    is_supervisory: boolean;
}

interface SupervisorOption {
    id: number;
    employee_id: string | null;
    name: string | null;
    role: StaffRole;
    position: string | null;
    position_id: number | null;
    level: number | null;
    is_active?: boolean;
}

interface EditableStaffUser {
    id: number;
    name: string;
    email: string;
    role: StaffRole;
    employee_id: string | null;
    position_id: number | null;
    supervisor_id: number | null;
    is_active: boolean;
}

interface EditStaffProps {
    user: EditableStaffUser;
    canEditAdmin: boolean;
    positions: PositionOption[];
    supervisors: SupervisorOption[];
    currentSupervisor: SupervisorOption | null;
}

type EditStaffForm = {
    name: string;
    employee_id: string;
    email: string;
    role: StaffRole;
    position_id: string;
    supervisor_id: string;
};

/*
|--------------------------------------------------------------------------
| Edit Employee
|--------------------------------------------------------------------------
*/

export default function Edit({
    user,
    canEditAdmin,
    positions,
    supervisors,
    currentSupervisor,
}: EditStaffProps) {
    
    const {
        data,
        setData,
        put,
        errors,
    } = useForm<EditStaffForm>({
        name:
            user.name,

        employee_id:
            user.employee_id ?? '',

        email:
            user.email,

        role:
            user.role,

        position_id:
            user.position_id !== null
                ? String(
                    user.position_id,
                )
                : '',

        supervisor_id:
            user.supervisor_id !== null
                ? String(
                    user.supervisor_id,
                )
                : '',
    });

const {
    processing,
    notification,
    startProcessing,
    showSuccess,
    showError,
    clearNotification,
} = useActionFeedback();

const [
    confirmSaveOpen,
    setConfirmSaveOpen,
] = useState(false);


    /*
    |--------------------------------------------------------------------------
    | Positions For Selected Role
    |--------------------------------------------------------------------------
    */

    const availablePositions =
        positions.filter(
            (position) =>
                position.role ===
                data.role,
        );

    const selectedPosition =
        positions.find(
            (position) =>
                String(
                    position.id,
                ) ===
                data.position_id,
        );

    /*
    |--------------------------------------------------------------------------
    | Eligible Supervisors
    |--------------------------------------------------------------------------
    |
    | Supervisor must:
    | - use the same PROWARE role
    | - have a higher organizational position
    |
    */

    const availableSupervisors =
        supervisors.filter(
            (supervisor) => {
                if (
                    !selectedPosition
                    || supervisor.level === null
                ) {
                    return false;
                }

                return (
                    supervisor.role ===
                        data.role
                    && supervisor.level <
                        selectedPosition.level
                );
            },
        );

/*
|--------------------------------------------------------------------------
| Historical Supervisor
|--------------------------------------------------------------------------
|
| If the employee's current supervisor is no longer part of the active
| eligible supervisor list, keep that existing relationship visible.
|
*/

const currentSupervisorIsEligible =
    currentSupervisor !== null
    && availableSupervisors.some(
        (supervisor) =>
            supervisor.id ===
            currentSupervisor.id,
    );

const showHistoricalSupervisor =
    currentSupervisor !== null
    && data.supervisor_id ===
        String(currentSupervisor.id)
    && !currentSupervisorIsEligible;


    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

    const submit = (
    event: FormEvent<HTMLFormElement>,
): void => {
    event.preventDefault();

    setConfirmSaveOpen(true);
};


const confirmSave = (): void => {
    if (processing) {
        return;
    }

    startProcessing();

    put(
        `/admin/users/${user.id}`,
        {
            preserveScroll: true,

            onSuccess: () => {
                    showSuccess(
                        'Employee information was updated successfully.',
                    );

                    setConfirmSaveOpen(false);
                },
            onError: () => {
                showError(
                    'Employee information could not be updated. Please check the form and try again.',
                );
            },
        },
    );
};

    return (
        <AdminLayout>
            <Head title="Edit Employee" />

            <div className="mx-auto max-w-3xl space-y-6">
                {/* HEADER */}
                <section>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                        STI PROWARE
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        Edit Employee
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Update the employee's
                        information, organizational
                        position, and reporting
                        relationship.
                    </p>
                </section>

                {/* ACCOUNT STATUS */}
                <section
                    className="
                        flex
                        items-center
                        justify-between
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        px-5
                        py-4
                        shadow-sm
                    "
                >
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            Account Status
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-800">
                            {user.is_active
                                ? 'Active'
                                : 'Disabled'}
                        </p>
                    </div>

                    <span
                        className={`
                            h-3
                            w-3
                            rounded-full

                            ${
                                user.is_active
                                    ? 'bg-emerald-500'
                                    : 'bg-red-500'
                            }
                        `}
                    />
                </section>

                {/* FORM */}
                <form
                    onSubmit={submit}
                    className="
                        overflow-hidden
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        shadow-sm
                    "
                >
                    <div className="space-y-6 p-6">
                        {/* NAME */}
                        <div>
                            <label
                                htmlFor="name"
                                className="text-sm font-bold text-slate-700"
                            >
                                Full Name
                            </label>

                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'name',
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="
                                    mt-2
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                "
                            />

                            {errors.name && (
                                <p className="mt-1.5 text-xs font-semibold text-red-600">
                                    {
                                        errors.name
                                    }
                                </p>
                            )}
                        </div>

                        {/* EMPLOYEE ID */}
                        <div>
                            <label
                                htmlFor="employee_id"
                                className="text-sm font-bold text-slate-700"
                            >
                                Employee ID
                            </label>

                            <input
                                id="employee_id"
                                type="text"
                                value={
                                    data.employee_id
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'employee_id',
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="
                                    mt-2
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    font-mono
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                "
                            />

                            {errors.employee_id && (
                                <p className="mt-1.5 text-xs font-semibold text-red-600">
                                    {
                                        errors
                                            .employee_id
                                    }
                                </p>
                            )}
                        </div>

                        {/* EMAIL */}
                        <div>
                            <label
                                htmlFor="email"
                                className="text-sm font-bold text-slate-700"
                            >
                                Email Address
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'email',
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="
                                    mt-2
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                "
                            />

                            {errors.email && (
                                <p className="mt-1.5 text-xs font-semibold text-red-600">
                                    {
                                        errors.email
                                    }
                                </p>
                            )}
                        </div>

                        {/* ROLE */}
                        <div>
                            <label
                                htmlFor="role"
                                className="text-sm font-bold text-slate-700"
                            >
                                PROWARE Role
                            </label>

                            <select
                                id="role"
                                value={data.role}
                                onChange={(
                                    event,
                                ) => {
                                    const role =
                                        event
                                            .target
                                            .value as StaffRole;

                                    setData(
                                        'role',
                                        role,
                                    );

                                    setData(
                                        'position_id',
                                        '',
                                    );

                                    setData(
                                        'supervisor_id',
                                        '',
                                    );
                                }}
                                className="
                                    mt-2
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                "
                            >
                                <option value="cashier">
                                    Cashier
                                </option>

                                <option value="specialist">
                                    Specialist
                                </option>

                                {canEditAdmin && (
                                    <option value="admin">
                                        Admin
                                    </option>
                                )}
                            </select>

                            {errors.role && (
                                <p className="mt-1.5 text-xs font-semibold text-red-600">
                                    {
                                        errors.role
                                    }
                                </p>
                            )}

                            <p className="mt-2 text-xs text-slate-400">
                                Role controls
                                PROWARE system access.
                            </p>
                        </div>

                        {/* POSITION */}
                        <div>
                            <label
                                htmlFor="position_id"
                                className="text-sm font-bold text-slate-700"
                            >
                                Position
                            </label>

                            <select
                                id="position_id"
                                value={
                                    data.position_id
                                }
                                onChange={(
                                    event,
                                ) => {
                                    setData(
                                        'position_id',
                                        event
                                            .target
                                            .value,
                                    );

                                    setData(
                                        'supervisor_id',
                                        '',
                                    );
                                }}
                                className="
                                    mt-2
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                "
                            >
                                <option value="">
                                    Select position
                                </option>

                                {availablePositions.map(
                                    (
                                        position,
                                    ) => (
                                        <option
                                            key={
                                                position.id
                                            }
                                            value={
                                                position.id
                                            }
                                        >
                                            {
                                                position.name
                                            }
                                        </option>
                                    ),
                                )}
                            </select>

                            {errors.position_id && (
                                <p className="mt-1.5 text-xs font-semibold text-red-600">
                                    {
                                        errors
                                            .position_id
                                    }
                                </p>
                            )}

                            <p className="mt-2 text-xs text-slate-400">
                                Position controls
                                organizational rank.
                            </p>
                        </div>

                        {/* SUPERVISOR */}
                        <div>
                            <label
                                htmlFor="supervisor_id"
                                className="text-sm font-bold text-slate-700"
                            >
                                Reports To
                            </label>

                            <select
                                id="supervisor_id"
                                value={
                                    data.supervisor_id
                                }
                                disabled={
                                    !selectedPosition
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'supervisor_id',
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="
                                    mt-2
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                    disabled:cursor-not-allowed
                                    disabled:bg-slate-100
                                    disabled:text-slate-400
                                "
                            >
                                <option value="">
                                        No supervisor
                                    </option>

                                    {showHistoricalSupervisor
                                        && currentSupervisor && (
                                            <option
                                                value={
                                                    currentSupervisor.id
                                                }
                                            >
                                                {currentSupervisor.name
                                                    ?? currentSupervisor.employee_id
                                                    ?? `Staff #${currentSupervisor.id}`}

                                                {currentSupervisor.position
                                                    ? ` — ${currentSupervisor.position}`
                                                    : ''}

                                                {' (Inactive — Current Supervisor)'}
                                            </option>
                                        )}

                                    {availableSupervisors.map(
                                    (
                                        supervisor,
                                    ) => (
                                        <option
                                            key={
                                                supervisor.id
                                            }
                                            value={
                                                supervisor.id
                                            }
                                        >
                                            {supervisor.name
                                                ?? supervisor
                                                    .employee_id
                                                ?? `Staff #${supervisor.id}`}

                                            {supervisor.position
                                                ? ` — ${supervisor.position}`
                                                : ''}
                                        </option>
                                    ),
                                )}
                            </select>

                            {errors.supervisor_id && (
                                <p className="mt-1.5 text-xs font-semibold text-red-600">
                                    {
                                        errors
                                            .supervisor_id
                                    }
                                </p>
                            )}

                            <p className="mt-2 text-xs text-slate-400">
                                Only eligible
                                supervisors with the
                                same PROWARE role and
                                a higher organizational
                                position are shown.
                            </p>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div
                        className="
                            flex
                            flex-col-reverse
                            gap-3
                            border-t
                            border-slate-100
                            bg-slate-50/50
                            px-6
                            py-5
                            sm:flex-row
                            sm:items-center
                            sm:justify-end
                        "
                    >
                        <Link
                            href="/admin/users"
                            className="
                                inline-flex
                                items-center
                                justify-center
                                rounded-xl
                                border
                                border-slate-200
                                bg-white
                                px-5
                                py-3
                                text-sm
                                font-bold
                                text-slate-600
                                transition
                                hover:bg-slate-50
                            "
                        >
                            Cancel
                        </Link>
                        <ActionProcessingButton
                            type="submit"
                            processing={processing}
                            idleText="Save Changes"
                            processingText="Saving..."
                            className="
                                bg-blue-600
                                px-5
                                py-3
                                text-white
                                hover:bg-blue-700
                            "
/>
                    </div>
                </form>

 </div>

                <ActionConfirmModal
                    open={confirmSaveOpen}
                    title="Save Employee Changes?"
                    message={`Save the updated information for ${user.name}?`}
                    confirmText="Save Changes"
                    processingText="Saving..."
                    processing={processing}
                    tone="primary"
                    onCancel={() =>
                        setConfirmSaveOpen(false)
                    }
                    onConfirm={
                        confirmSave
                    }
                />

                {notification && (
                    <ActionNotification
                        type={notification.type}
                        message={notification.message}
                        onClose={
                            clearNotification
                        }
                    />
                )}
        </AdminLayout>
    );
}