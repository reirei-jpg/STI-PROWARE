import {
    Head,
    Link,
    useForm,
} from '@inertiajs/react';
import {
    ArrowLeft,
    Eye,
    EyeOff,
    GraduationCap,
    LockKeyhole,
    Mail,
    ShieldCheck,
    UserRound,
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

interface StudentFormData {
    full_name: string;
    student_id: string;
    last_name: string;
    course: string;
    year_level: string;
    password: string;
    password_confirmation: string;
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Create() {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] =
        useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const {
        processing,
        notification,
        startProcessing,
        showError,
        clearNotification,
    } = useActionFeedback();

    const form = useForm<StudentFormData>({
        full_name: '',
        student_id: '',
        last_name: '',
        course: '',
        year_level: '',
        password: '',
        password_confirmation: '',
    });

    /*
     * Live preview of the generated school email, purely informational
     * here — the real value is always derived server-side from the
     * submitted Student ID and last name, the same way it is on the
     * public registration page. Computed directly during render (no
     * state/effect needed) since it's entirely derived from form data
     * already available here.
     */
    const normalizedStudentId =
        form.data.student_id.replace(/\D/g, '');

    const normalizedLastName = form.data.last_name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');

    const generatedEmail =
        normalizedStudentId.length === 11
        && normalizedLastName.length > 0
            ? `${normalizedLastName}.${normalizedStudentId.slice(-6)}@sti.edu.ph`
            : '';

    const handleStudentIdChange = (value: string) => {
        const numericValue = value
            .replace(/\D/g, '')
            .slice(0, 11);

        form.setData('student_id', numericValue);
    };

    const handleYearLevelChange = (value: string) => {
        const numericValue = value
            .replace(/\D/g, '')
            .slice(0, 2);

        form.setData('year_level', numericValue);
    };

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        setShowConfirmModal(true);
    };

    const confirmCreate = (): void => {
        if (processing) {
            return;
        }

        startProcessing();

        form.post('/admin/students', {
            preserveScroll: true,

            onSuccess: () => {
                setShowConfirmModal(false);
            },

            onError: () => {
                setShowConfirmModal(false);

                showError(
                    'Student account could not be created. Please check the form and try again.',
                );
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Create Student Account" />

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}

            <div className="mx-auto max-w-4xl space-y-5">
                <Link
                    href="/admin/students"
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-800"
                >
                    <ArrowLeft size={17} />
                    Back to Students
                </Link>

                <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-black tracking-wide text-blue-600 uppercase">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            Create Student Account
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            For a student who can&apos;t register
                            themselves. The school email is still
                            generated automatically the same way
                            self-registration does — you can&apos;t
                            type a different one.
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700">
                        <ShieldCheck size={16} />
                        Admin-only action
                    </div>
                </section>

                <form
                    onSubmit={submit}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                    <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-2">
                        <FormField
                            label="Full Name"
                            error={form.errors.full_name}
                        >
                            <InputWrapper>
                                <UserRound
                                    size={18}
                                    className="text-slate-400"
                                />

                                <input
                                    type="text"
                                    autoComplete="off"
                                    value={form.data.full_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'full_name',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Juan Dela Cruz"
                                    className={inputClass}
                                />
                            </InputWrapper>
                        </FormField>

                        <FormField
                            label="Student ID"
                            error={form.errors.student_id}
                        >
                            <InputWrapper>
                                <GraduationCap
                                    size={18}
                                    className="text-slate-400"
                                />

                                <input
                                    type="text"
                                    autoComplete="off"
                                    inputMode="numeric"
                                    maxLength={11}
                                    value={form.data.student_id}
                                    onChange={(event) =>
                                        handleStudentIdChange(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="02000361070"
                                    className={inputClass}
                                />
                            </InputWrapper>
                        </FormField>

                        <div>
                            <FormField
                                label="Last Name"
                                error={form.errors.last_name}
                            >
                                <InputWrapper>
                                    <UserRound
                                        size={18}
                                        className="text-slate-400"
                                    />

                                    <input
                                        type="text"
                                        autoComplete="off"
                                        value={form.data.last_name}
                                        onChange={(event) =>
                                            form.setData(
                                                'last_name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Dela Cruz"
                                        className={inputClass}
                                    />
                                </InputWrapper>
                            </FormField>

                            <p className="mt-2 text-xs leading-5 text-slate-400">
                                Used only to generate the school email
                                below.
                            </p>
                        </div>

                        <FormField label="Generated School Email">
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
                                    placeholder="Fill in Student ID and last name first"
                                    className={inputClass}
                                />
                            </InputWrapper>
                        </FormField>

                        <FormField
                            label="Course"
                            error={form.errors.course}
                        >
                            <InputWrapper>
                                <GraduationCap
                                    size={18}
                                    className="text-slate-400"
                                />

                                <input
                                    type="text"
                                    autoComplete="off"
                                    value={form.data.course}
                                    onChange={(event) =>
                                        form.setData(
                                            'course',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="BSIT"
                                    className={inputClass}
                                />
                            </InputWrapper>
                        </FormField>

                        <FormField
                            label="Year Level"
                            error={form.errors.year_level}
                        >
                            <InputWrapper>
                                <GraduationCap
                                    size={18}
                                    className="text-slate-400"
                                />

                                <input
                                    type="text"
                                    autoComplete="off"
                                    inputMode="numeric"
                                    maxLength={2}
                                    value={form.data.year_level}
                                    onChange={(event) =>
                                        handleYearLevelChange(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="1"
                                    className={inputClass}
                                />
                            </InputWrapper>
                        </FormField>

                        <div>
                            <FormField
                                label="Temporary Password"
                                error={form.errors.password}
                            >
                                <InputWrapper>
                                    <LockKeyhole
                                        size={18}
                                        className="text-slate-400"
                                    />

                                    <input
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        autoComplete="new-password"
                                        value={form.data.password}
                                        onChange={(event) =>
                                            form.setData(
                                                'password',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Create a temporary password"
                                        className={inputClass}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(
                                                (current) => !current,
                                            )
                                        }
                                        className="shrink-0 text-slate-400 transition hover:text-blue-600"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={17} />
                                        ) : (
                                            <Eye size={17} />
                                        )}
                                    </button>
                                </InputWrapper>
                            </FormField>

                            <p className="mt-2 text-xs leading-5 text-slate-400">
                                At least 8 characters, with a
                                combination of letters, numbers, and a
                                special character (e.g. ! @ # $). The
                                student will be required to change
                                this on first login.
                            </p>
                        </div>

                        <FormField
                            label="Confirm Password"
                            error={form.errors.password_confirmation}
                        >
                            <InputWrapper>
                                <LockKeyhole
                                    size={18}
                                    className="text-slate-400"
                                />

                                <input
                                    type={
                                        showPasswordConfirmation
                                            ? 'text'
                                            : 'password'
                                    }
                                    autoComplete="new-password"
                                    value={
                                        form.data
                                            .password_confirmation
                                    }
                                    onChange={(event) =>
                                        form.setData(
                                            'password_confirmation',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Enter the password again"
                                    className={inputClass}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPasswordConfirmation(
                                            (current) => !current,
                                        )
                                    }
                                    className="shrink-0 text-slate-400 transition hover:text-blue-600"
                                >
                                    {showPasswordConfirmation ? (
                                        <EyeOff size={17} />
                                    ) : (
                                        <Eye size={17} />
                                    )}
                                </button>
                            </InputWrapper>
                        </FormField>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-7">
                        <Link
                            href="/admin/students"
                            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            className="rounded-xl bg-[#0D6EFD] px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                        >
                            Create Account
                        </button>
                    </div>
                </form>
            </div>

            <ActionConfirmModal
                open={showConfirmModal}
                title="Create Student Account"
                message={`Double check before you continue: ${form.data.full_name || 'this account'} (Student ID ${form.data.student_id}) will be created with the email ${generatedEmail || '(fill in Student ID and last name first)'} and the temporary password you set. They'll be required to change it on first login.`}
                confirmText="Create Account"
                processingText="Creating account..."
                processing={processing}
                onCancel={() => setShowConfirmModal(false)}
                onConfirm={confirmCreate}
            />
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

function InputWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
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
