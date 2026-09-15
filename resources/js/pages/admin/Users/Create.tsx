import {
    ArrowLeft,
    BriefcaseBusiness,
    Eye,
    EyeOff,
    Mail,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

import {
    Head,
    Link,
    useForm,
} from '@inertiajs/react';

import {
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';

type StaffRole =
    | 'cashier'
    | 'specialist'
    | 'admin';

interface StaffFormData {
    name: string;
    employee_id: string;
    email: string;
    role: StaffRole;
    position_id: string;
    supervisor_id: string;
    password: string;
    password_confirmation: string;
}

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
}

interface CreateStaffProps {
    canCreateAdmin: boolean;
    positions: PositionOption[];
    supervisors: SupervisorOption[];
}

export default function Create({
    canCreateAdmin,
    positions,
    supervisors,
}: CreateStaffProps) {
    
    
    const [
        showPassword,
        setShowPassword,
    ] = useState(false);

    const [
        showPasswordConfirmation,
        setShowPasswordConfirmation,
    ] = useState(false);

    const form =
        useForm<StaffFormData>({
            name: '',
            employee_id: '',
            email: '',
            role: 'cashier',
            position_id: '',
            supervisor_id: '',
            password: '',
            password_confirmation: '',
        });

const {
    processing,
    notification,
    startProcessing,
    showError,
    clearNotification,
} = useActionFeedback();

const [
    confirmCreateOpen,
    setConfirmCreateOpen,
] = useState(false);
        

    const submit = (
    event: React.FormEvent<HTMLFormElement>,
): void => {
    event.preventDefault();

    setConfirmCreateOpen(true);
};

const confirmCreate = (): void => {
    if (processing) {
        return;
    }

    startProcessing();

    form.post(
        '/admin/users',
        {
            preserveScroll: true,

            onSuccess: () => {
                setConfirmCreateOpen(
                    false,
                );
            },

            onError: () => {
                setConfirmCreateOpen(
                    false,
                );

                showError(
                    'Staff account could not be created. Please check the form and try again.',
                );
            },
        },
    );
};

    return (
        <AdminLayout>
            <Head title="Create Staff Account" />

            <div className="mx-auto max-w-5xl space-y-5">
                {/* BACK */}
                <Link
                    href="/admin/users"
                    className="
                        inline-flex
                        items-center
                        gap-2
                        text-sm
                        font-bold
                        text-blue-600
                        transition
                        hover:text-blue-800
                    "
                >
                    <ArrowLeft size={17} />

                    Back to Users
                </Link>

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
                            Create Staff Account
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Create login access for a
                            Cashier, Specialist, or
                            additional Admin account.
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
                        <ShieldCheck size={16} />

                        Admin-only action
                    </div>
                </section>

                {/* NOTICE */}
                <section
                    className="
                        rounded-2xl
                        border
                        border-amber-200
                        bg-amber-50
                        px-5
                        py-4
                    "
                >
                    <p className="text-sm font-black text-amber-800">
                        Students are not created here.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-700">
                        Student accounts must continue
                        using the approved Student
                        Registry registration process.
                    </p>
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
                    <div
                        className="
                            grid
                            gap-6
                            p-6
                            sm:p-7
                            lg:grid-cols-2
                        "
                    >
                        {/* NAME */}
                        <FormField
                            label="Full Name"
                            error={
                                form.errors.name
                            }
                        >
                            <InputWrapper>
                                <UserRound
                                    size={18}
                                    className="text-slate-400"
                                />

                                <input
                                    type="text"
                                    value={
                                        form.data.name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        form.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. Maria Santos"
                                    autoComplete="name"
                                    className={inputClass}
                                />
                            </InputWrapper>
                        </FormField>

                        {/* EMPLOYEE ID */}
                        <FormField
                            label="Employee ID"
                            error={
                                form.errors.employee_id
                            }
                        >
                            <InputWrapper>
                                <BriefcaseBusiness
                                    size={18}
                                    className="text-slate-400"
                                />

                                <input
                                    type="text"
                                    value={
                                        form.data
                                            .employee_id
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        form.setData(
                                            'employee_id',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. EMP-0001"
                                    className={inputClass}
                                />
                            </InputWrapper>
                        </FormField>

                        {/* EMAIL */}
                        <FormField
                            label="Email Address"
                            error={
                                form.errors.email
                            }
                        >
                            <InputWrapper>
                                <Mail
                                    size={18}
                                    className="text-slate-400"
                                />

                                <input
                                    type="email"
                                    value={
                                        form.data.email
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        form.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="staff@example.com"
                                    autoComplete="email"
                                    className={inputClass}
                                />
                            </InputWrapper>
                        </FormField>

                        {/* ROLE */}
                        <FormField
                            label="PROWARE Role"
                            error={
                                form.errors.role
                            }
                        >
                            <select
                                value={
                                    form.data.role
                                }
                                onChange={(event) => {
                                    const role =
                                        event.target.value as StaffRole;

                                    form.setData((current) => ({
                                        ...current,
                                        role,
                                        position_id: '',
                                        supervisor_id: '',
                                    }));
                                }}
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-slate-800
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

                                {canCreateAdmin && (
                                    <option value="admin">
                                        Admin
                                    </option>
                                )}
                            </select>

                            <RoleDescription
                                role={
                                    form.data.role
                                }
                            />
                        </FormField>

                        {/* POSITION */}
                        <FormField
                            label="Position"
                            error={form.errors.position_id}
                        >
                            <select
                                value={form.data.position_id}
                                onChange={(event) =>
                                    form.setData(
                                        'position_id',
                                        event.target.value,
                                    )
                                }
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-slate-800
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

                                {positions
                                    .filter(
                                        (position) =>
                                            position.role === form.data.role,
                                    )
                                    .map((position) => (
                                        <option
                                            key={position.id}
                                            value={position.id}
                                        >
                                            {position.name}
                                        </option>
                                    ))}
                            </select>

                            <p className="mt-2 text-xs leading-5 text-slate-400">
                                Positions shown here match the selected
                                PROWARE role.
                            </p>
                        </FormField>


                        {/* SUPERVISOR */}
                        <FormField
                            label="Reports To"
                            error={form.errors.supervisor_id}
                        >
                            <select
                                value={form.data.supervisor_id}
                                onChange={(event) =>
                                    form.setData(
                                        'supervisor_id',
                                        event.target.value,
                                    )
                                }
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-4
                                        py-3
                                        text-sm
                                        font-semibold
                                        text-slate-800
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-100
                                    "
                                >
                                    <option value="">
                                        No supervisor
                                    </option>

                                    {supervisors
                                        .filter(
                                            (supervisor) =>
                                                supervisor.role ===
                                                form.data.role,
                                        )
                                        .map((supervisor) => (
                                            <option
                                                key={supervisor.id}
                                                value={supervisor.id}
                                            >
                                                {supervisor.name}
                                                {' — '}
                                                {supervisor.position}
                                            </option>
                                        ))}
                                </select>

                                <p className="mt-2 text-xs leading-5 text-slate-400">
                                    Only active supervisory staff matching
                                    the selected PROWARE role are shown.
                                </p>
                            </FormField>

                        {/* PASSWORD */}
                        <FormField
                            label="Temporary Password"
                            error={
                                form.errors.password
                            }
                        >
                            <div className="relative">
                                <input
                                    type={
                                        showPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    value={
                                        form.data.password
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        form.setData(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="new-password"
                                    placeholder="Enter temporary password"
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-4
                                        py-3
                                        pr-12
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-100
                                    "
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            (current) =>
                                                !current,
                                        )
                                    }
                                    className="
                                        absolute
                                        right-3
                                        top-1/2
                                        flex
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        text-slate-400
                                        transition
                                        hover:text-slate-700
                                    "
                                    aria-label={
                                        showPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff
                                            size={18}
                                        />
                                    ) : (
                                        <Eye
                                            size={18}
                                        />
                                    )}
                                </button>
                            </div>

                            <p className="mt-2 text-xs leading-5 text-slate-400">
                                The staff member can
                                change this password
                                later through account
                                settings.
                            </p>
                        </FormField>

                        {/* CONFIRM PASSWORD */}
                        <FormField
                            label="Confirm Password"
                            error={
                                form.errors
                                    .password_confirmation
                            }
                        >
                            <div className="relative">
                                <input
                                    type={
                                        showPasswordConfirmation
                                            ? 'text'
                                            : 'password'
                                    }
                                    value={
                                        form.data
                                            .password_confirmation
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        form.setData(
                                            'password_confirmation',
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="new-password"
                                    placeholder="Re-enter temporary password"
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-4
                                        py-3
                                        pr-12
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-100
                                    "
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPasswordConfirmation(
                                            (current) =>
                                                !current,
                                        )
                                    }
                                    className="
                                        absolute
                                        right-3
                                        top-1/2
                                        flex
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        text-slate-400
                                        transition
                                        hover:text-slate-700
                                    "
                                    aria-label={
                                        showPasswordConfirmation
                                            ? 'Hide password confirmation'
                                            : 'Show password confirmation'
                                    }
                                >
                                    {showPasswordConfirmation ? (
                                        <EyeOff
                                            size={18}
                                        />
                                    ) : (
                                        <Eye
                                            size={18}
                                        />
                                    )}
                                </button>
                            </div>
                        </FormField>
                    </div>

                    {/* FOOTER */}
                    <div
                        className="
                            flex
                            flex-col
                            gap-3
                            border-t
                            border-slate-100
                            bg-slate-50/70
                            px-6
                            py-5
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                            sm:px-7
                        "
                    >
                        <p className="max-w-xl text-xs leading-5 text-slate-500">
                            New accounts are created as
                            active and may be disabled
                            later from User Management.
                        </p>

                        <div className="flex gap-3">
                            <Link
                                href="/admin/users"
                                className="
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
                                    hover:bg-slate-100
                                "
                            >
                                Cancel
                            </Link>

                            <ActionProcessingButton
                                type="submit"
                                processing={processing}
                                idleText="Create Account"
                                processingText="Creating..."
                                className="
                                    bg-[#0D6EFD]
                                    px-5
                                    py-3
                                    text-white
                                    hover:bg-blue-700
                                "
                            />
                        </div>
                    </div>
                </form>
            </div>

<ActionConfirmModal
    open={confirmCreateOpen}
    title="Create Staff Account?"
    message={`Create a new ${form.data.role} account for ${form.data.name || 'this employee'}?`}
    confirmText="Create Account"
    processingText="Creating..."
    processing={processing}
    tone="primary"
    onCancel={() =>
        setConfirmCreateOpen(false)
    }
    onConfirm={
        confirmCreate
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

/*
|--------------------------------------------------------------------------
| Form Field
|--------------------------------------------------------------------------
*/

function FormField({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </label>

            {children}

            {error && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Input Wrapper
|--------------------------------------------------------------------------
*/

function InputWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className="
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                transition
                focus-within:border-blue-500
                focus-within:ring-4
                focus-within:ring-blue-100
            "
        >
            {children}
        </div>
    );
}

const inputClass = `
    min-w-0
    flex-1
    border-0
    bg-transparent
    py-3
    text-sm
    text-slate-900
    outline-none
    ring-0
`;

/*
|--------------------------------------------------------------------------
| Role Description
|--------------------------------------------------------------------------
*/

function RoleDescription({
    role,
}: {
    role: StaffRole;
}) {
    const descriptions: Record<
        StaffRole,
        string
    > = {
        cashier:
            'Confirms student payments through the QR payment workflow.',

        specialist:
            'Receives stock and releases paid merchandise through QR fulfillment.',

        admin:
            'Manages products, users, reports, and overall PROWARE oversight.',
    };

    return (
        <p className="mt-2 text-xs leading-5 text-slate-400">
            {descriptions[role]}
        </p>
    );
}