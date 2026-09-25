
import {
    Head,
    Link,
    useForm,
} from '@inertiajs/react';
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
    useState,
} from 'react';


import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import AdminLayout from '@/layouts/AdminLayout';

type StaffRole =
    | 'cashier'
    | 'specialist'
    | 'admin';

interface StaffFormData {
    name: string;
    employee_id: string;
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
            role: 'cashier',
            position_id: '',
            supervisor_id: '',
            password: '',
            password_confirmation: '',
        });

    /*
     * The staff email is never typed directly — it's generated from
     * the Full Name and Employee ID, the same way a student's school
     * email is generated from their last name and Student ID. This is
     * only a preview; the real value is always derived server-side
     * from the submitted name and Employee ID (see
     * StaffSchoolEmailGenerator), so it can't be spoofed. Computed
     * directly during render since it's entirely derived from form
     * data already available here.
     */
    const normalizedName = form.data.name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 0)
        .join('.');

    const normalizedEmployeeId = form.data.employee_id
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');

    const generatedEmail =
        normalizedName.length > 0
        && normalizedEmployeeId.length > 0
            ? `${normalizedName}.${normalizedEmployeeId}@proware.sti.edu.ph`
            : '';

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
                        Students register themselves at
                        the Student Registration page, or
                        you can create an account for one
                        directly from{' '}
                        <Link
                            href="/admin/students/create"
                            className="font-bold underline underline-offset-2 hover:text-amber-900"
                        >
                            Students &rarr; Create Student
                            Account
                        </Link>
                        .
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
                                            event.target.value.slice(0, 255),
                                        )
                                    }
                                    placeholder="e.g. Juan Dela Cruz"
                                    maxLength={255}
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
                                            event.target.value.slice(0, 50),
                                        )
                                    }
                                    placeholder="e.g. EMP-0001"
                                    maxLength={50}
                                    autoComplete="off"
                                    className={inputClass}
                                />
                            </InputWrapper>
                        </FormField>

                        {/* GENERATED EMAIL */}
                        <FormField label="Generated Staff Email">
                            <InputWrapper>
                                <Mail
                                    size={18}
                                    className="text-slate-400"
                                />

                                <input
                                    type="text"
                                    autoComplete="off"
                                    value={generatedEmail}
                                    readOnly
                                    placeholder="Fill in Full Name and Employee ID first"
                                    className={inputClass}
                                />
                            </InputWrapper>

                            <p className="mt-2 text-xs leading-5 text-slate-400">
                                Generated automatically from the Full
                                Name and Employee ID above.
                            </p>
                        </FormField>

                        {/* ROLE */}
                        <FormField
                            label="PROWARE Role"
                            error={
                                form.errors.role
                            }
                            className="lg:col-span-2"
                        >
                            <div
                                className="
                                    grid
                                    gap-3
                                    sm:grid-cols-3
                                "
                            >
                                <SelectableTile
                                    label="Cashier"
                                    description="Confirms student payments through the QR payment workflow."
                                    checked={form.data.role === 'cashier'}
                                    onChange={() =>
                                        form.setData((current) => ({
                                            ...current,
                                            role: 'cashier',
                                            position_id: '',
                                            supervisor_id: '',
                                        }))
                                    }
                                />

                                <SelectableTile
                                    label="Specialist"
                                    description="Receives stock and releases paid merchandise through QR fulfillment."
                                    checked={form.data.role === 'specialist'}
                                    onChange={() =>
                                        form.setData((current) => ({
                                            ...current,
                                            role: 'specialist',
                                            position_id: '',
                                            supervisor_id: '',
                                        }))
                                    }
                                />

                                {canCreateAdmin && (
                                    <SelectableTile
                                        label="Admin"
                                        description="Manages products, users, reports, and overall PROWARE oversight."
                                        checked={form.data.role === 'admin'}
                                        onChange={() =>
                                            form.setData((current) => ({
                                                ...current,
                                                role: 'admin',
                                                position_id: '',
                                                supervisor_id: '',
                                            }))
                                        }
                                    />
                                )}
                            </div>
                        </FormField>

                        {/* POSITION */}
                        <FormField
                            label="Position"
                            error={form.errors.position_id}
                            className="lg:col-span-2"
                        >
                            {(() => {
                                const availablePositions = positions.filter(
                                    (position) =>
                                        position.role === form.data.role,
                                );

                                if (availablePositions.length === 0) {
                                    return (
                                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                                            No active positions have been set
                                            up for this role yet.
                                        </p>
                                    );
                                }

                                return (
                                    <div
                                        className="
                                            grid
                                            gap-3
                                            sm:grid-cols-2
                                            lg:grid-cols-3
                                        "
                                    >
                                        {availablePositions.map(
                                            (position) => (
                                                <SelectableTile
                                                    key={position.id}
                                                    label={position.name}
                                                    checked={
                                                        form.data
                                                            .position_id ===
                                                        String(position.id)
                                                    }
                                                    onChange={() =>
                                                        form.setData(
                                                            'position_id',
                                                            String(
                                                                position.id,
                                                            ),
                                                        )
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
                                );
                            })()}

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
    message={`Create a new ${form.data.role} account for ${form.data.name || 'this employee'}? Their login email will be ${generatedEmail || '(fill in Full Name and Employee ID first)'}.`}
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
    className = '',
    children,
}: {
    label: string;
    error?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={className}>
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
| Selectable Tile
|--------------------------------------------------------------------------
|
| A single-select "checkbox" tile: checking one unchecks the others in
| its group, since a staff member can only have one Role and one
| Position. Built as a real checkbox input (not a styled div) so it
| stays keyboard- and screen-reader-accessible.
*/

function SelectableTile({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label
            className={`
                flex
                cursor-pointer
                items-start
                gap-3
                rounded-xl
                border
                p-4
                transition
                ${
                    checked
                        ? 'border-blue-500 bg-blue-50/60 ring-4 ring-blue-100'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                }
            `}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />

            <div>
                <p className="text-sm font-black text-slate-800">
                    {label}
                </p>

                {description && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        {description}
                    </p>
                )}
            </div>
        </label>
    );
}