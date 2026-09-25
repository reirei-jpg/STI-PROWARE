import {
    Head,
    useForm,
} from '@inertiajs/react';
import {
    Check,
    Eye,
    EyeOff,
    GraduationCap,
    LockKeyhole,
    Mail,
    UserRound,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';


import {

    useEffect,
    useState
} from 'react';
import type {FormEvent} from 'react';
import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import { clampNumberInput } from '@/lib/utils';

interface RegisterFormData {
    student_id: string;
    full_name: string;
    last_name: string;
    course: string;
    year_level: string;
    email: string;
    password: string;
    password_confirmation: string;
    terms: boolean;
}

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] =
        useState(false);

    const [showConfirmModal, setShowConfirmModal] =
        useState(false);

    const form = useForm<RegisterFormData>({
        student_id: '',
        full_name: '',
        last_name: '',
        course: '',
        year_level: '',
        email: '',
        password: '',
        password_confirmation: '',
        terms: false,
    });

    /*
     * Automatically generate the STI school email whenever
     * the Student ID or last name changes.
     *
     * Example:
     * Student ID: 02000361070
     * Last name: Dasigan
     * Result: dasigan.361070@sti.edu.ph
     */
    useEffect(() => {
        const normalizedStudentId =
            form.data.student_id.replace(/\D/g, '');

        const normalizedLastName = form.data.last_name
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');

        if (
            normalizedStudentId.length === 11 &&
            normalizedLastName.length > 0
        ) {
            const lastSixDigits =
                normalizedStudentId.slice(-6);

            const generatedEmail =
                `${normalizedLastName}.${lastSixDigits}@sti.edu.ph`;

            if (form.data.email !== generatedEmail) {
                form.setData('email', generatedEmail);
            }

            return;
        }

        if (form.data.email !== '') {
            form.setData('email', '');
        }
    }, [
        form.data.student_id,
        form.data.last_name,
        form.data.email,
    ]);

    const handleStudentIdChange = (value: string) => {
        /*
         * Allow numbers only and limit the input to 11 digits.
         */
        const numericValue = value
            .replace(/\D/g, '')
            .slice(0, 11);

        form.setData('student_id', numericValue);
    };

    const submit = (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        setShowConfirmModal(true);
    };

    const confirmRegister = () => {
        form.post('/register', {
            preserveScroll: true,

            onSuccess: () => {
                setShowConfirmModal(false);
            },

            onError: () => {
                setShowConfirmModal(false);
            },

            onFinish: () => {
                form.reset(
                    'password',
                    'password_confirmation',
                );
            },
        });
    };

    return (
        <>
            <Head title="Student Registration" />

            <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 py-12">
                {/* Blue top decoration */}
                <div className="absolute inset-x-0 top-0 h-24 bg-[#0D6EFD]" />

                {/* Yellow right decoration */}
                <div className="absolute right-0 top-16 hidden h-72 w-40 rounded-l-[3rem] bg-yellow-400 md:block" />

                {/* Blue left decoration */}
                <div className="absolute bottom-0 left-0 hidden h-40 w-36 bg-[#0D6EFD] md:block" />

                {/* Yellow bottom decoration */}
                <div className="absolute -bottom-20 right-0 hidden h-52 w-[28rem] rounded-tl-[4rem] bg-yellow-400 md:block" />

                <section className="relative z-10 w-full max-w-3xl rounded-[2.5rem] border border-slate-200 bg-white px-6 py-10 shadow-2xl shadow-slate-300/40 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-xl">
                        <div className="text-center">
                            <a
                                href="/"
                                className="inline-flex items-center gap-3"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-sm font-black text-blue-700 shadow">
                                    STI
                                </div>

                                <span className="text-2xl font-bold text-slate-950">
                                    PROWARE
                                </span>
                            </a>

                            <h1 className="mt-7 text-3xl font-bold text-slate-950">
                                Student Registration
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                Fill in your details below to create
                                your student account.
                            </p>
                        </div>

                        <form
                            onSubmit={submit}
                            className="mt-9 space-y-5"
                        >
                            <RegistrationInput
                                id="student_id"
                                label="Student ID number"
                                type="text"
                                icon={GraduationCap}
                                value={form.data.student_id}
                                placeholder="02000361070"
                                autoComplete="off"
                                inputMode="numeric"
                                maxLength={11}
                                error={
                                    form.errors.student_id
                                }
                                onChange={
                                    handleStudentIdChange
                                }
                            />

                            <RegistrationInput
                                id="full_name"
                                label="Full name"
                                type="text"
                                icon={UserRound}
                                value={form.data.full_name}
                                placeholder="Juan Dela Cruz"
                                autoComplete="name"
                                error={
                                    form.errors.full_name
                                }
                                onChange={(value) =>
                                    form.setData(
                                        'full_name',
                                        value,
                                    )
                                }
                            />

                            <div>
                                <RegistrationInput
                                    id="last_name"
                                    label="Last name"
                                    type="text"
                                    icon={UserRound}
                                    value={form.data.last_name}
                                    placeholder="Dela Cruz"
                                    autoComplete="family-name"
                                    error={
                                        form.errors.last_name
                                    }
                                    onChange={(value) =>
                                        form.setData(
                                            'last_name',
                                            value,
                                        )
                                    }
                                />

                                <p className="mt-2 px-4 text-xs leading-5 text-slate-500">
                                    Used only to generate your school
                                    email below.
                                </p>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <RegistrationInput
                                    id="course"
                                    label="Course"
                                    type="text"
                                    icon={GraduationCap}
                                    value={form.data.course}
                                    placeholder="BSIT"
                                    autoComplete="off"
                                    error={
                                        form.errors.course
                                    }
                                    onChange={(value) =>
                                        form.setData(
                                            'course',
                                            value,
                                        )
                                    }
                                />

                                <RegistrationInput
                                    id="year_level"
                                    label="Year level"
                                    type="text"
                                    icon={GraduationCap}
                                    value={form.data.year_level}
                                    placeholder="1"
                                    autoComplete="off"
                                    inputMode="numeric"
                                    maxLength={2}
                                    error={
                                        form.errors.year_level
                                    }
                                    onChange={(value) =>
                                        form.setData(
                                            'year_level',
                                            clampNumberInput(
                                                value.replace(/\D/g, '').slice(0, 2),
                                                10,
                                            ),
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    STI school email
                                </label>

                                <div className="relative">
                                    <Mail
                                        size={19}
                                        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
                                    />

                                    <input
                                        id="email"
                                        name="email"
                                        type="text"
                                        value={form.data.email}
                                        readOnly
                                        autoComplete="off"
                                        placeholder="dasigan.361070@sti.edu.ph"
                                        className={`
                                            w-full rounded-full border
                                            bg-transparent py-4 pl-14 pr-5
                                            text-base font-medium
                                            text-slate-900 outline-none
                                            transition
                                            placeholder:text-slate-400
                                            ${
                                                form.errors.email
                                                    ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                                    : 'border-slate-300 focus:border-[#0D6EFD] focus:ring-4 focus:ring-blue-100'
                                            }
                                        `}
                                    />
                                </div>

                                <p className="mt-2 px-4 text-xs leading-5 text-slate-500">
                                    The email is generated from your
                                    last name and the last six digits
                                    of your Student ID.
                                </p>

                                {form.errors.email && (
                                    <p className="mt-2 px-4 text-sm text-red-600">
                                        {form.errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <PasswordInput
                                    id="password"
                                    label="Password"
                                    value={form.data.password}
                                    placeholder="Create a secure password"
                                    visible={showPassword}
                                    error={
                                        form.errors.password
                                    }
                                    onToggle={() =>
                                        setShowPassword(
                                            (current) =>
                                                !current,
                                        )
                                    }
                                    onChange={(value) =>
                                        form.setData(
                                            'password',
                                            value,
                                        )
                                    }
                                />

                                <p className="mt-2 px-4 text-xs leading-5 text-slate-500">
                                    At least 8 characters, with a
                                    combination of letters, numbers,
                                    and a special character (e.g. !
                                    @ # $).
                                </p>
                            </div>

                            <PasswordInput
                                id="password_confirmation"
                                label="Confirm password"
                                value={
                                    form.data
                                        .password_confirmation
                                }
                                placeholder="Enter the password again"
                                visible={showConfirmation}
                                error={
                                    form.errors
                                        .password_confirmation
                                }
                                onToggle={() =>
                                    setShowConfirmation(
                                        (current) =>
                                            !current,
                                    )
                                }
                                onChange={(value) =>
                                    form.setData(
                                        'password_confirmation',
                                        value,
                                    )
                                }
                            />

                            <div>
                                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={
                                            form.data.terms
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                'terms',
                                                event.target
                                                    .checked,
                                            )
                                        }
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />

                                    <span>
                                        I confirm that the
                                        Student ID and account
                                        information belong to me.
                                    </span>
                                </label>

                                {form.errors.terms && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {form.errors.terms}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={
                                    form.processing ||
                                    form.data.email === ''
                                }
                                className="
                                    flex w-full items-center
                                    justify-center gap-2
                                    rounded-full
                                    bg-gradient-to-r
                                    from-[#0D6EFD]
                                    to-blue-700
                                    px-6 py-4
                                    text-sm font-bold
                                    text-white
                                    shadow-lg
                                    shadow-blue-500/25
                                    transition
                                    hover:-translate-y-0.5
                                    disabled:cursor-not-allowed
                                    disabled:opacity-60
                                "
                            >
                                <Check size={18} />

                                {form.processing
                                    ? 'Creating account...'
                                    : 'Create Student Account'}
                            </button>
                        </form>

                        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
                            <p className="text-sm text-slate-500">
                                Already registered?{' '}

                                <a
                                    href="/login"
                                    className="font-semibold text-blue-600 hover:text-blue-700"
                                >
                                    Log in
                                </a>
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <ActionConfirmModal
                open={showConfirmModal}
                title="Create Student Account"
                message={`Double check before you continue: ${form.data.full_name || 'this account'} (Student ID ${form.data.student_id}) will be registered with the email ${form.data.email}. This information belongs to you and cannot easily be changed later.`}
                confirmText="Create Account"
                processingText="Creating account..."
                processing={form.processing}
                onCancel={() => setShowConfirmModal(false)}
                onConfirm={confirmRegister}
            />
        </>
    );
}

interface RegistrationInputProps {
    id: string;
    label: string;
    type: 'text' | 'email';
    icon: LucideIcon;
    value: string;
    placeholder: string;
    autoComplete: string;
    inputMode?: 'text' | 'numeric';
    maxLength?: number;
    error?: string;
    onChange: (value: string) => void;
}

function RegistrationInput({
    id,
    label,
    type,
    icon: Icon,
    value,
    placeholder,
    autoComplete,
    inputMode = 'text',
    maxLength,
    error,
    onChange,
}: RegistrationInputProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block text-sm font-semibold text-slate-700"
            >
                {label}
            </label>

            <div className="relative">
                <Icon
                    size={19}
                    className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                    id={id}
                    name={id}
                    type={type}
                    value={value}
                    onChange={(event) =>
                        onChange(event.target.value)
                    }
                    autoComplete={autoComplete}
                    inputMode={inputMode}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    className={`
                        w-full rounded-full border
                        bg-transparent py-4 pl-14 pr-5
                        text-base font-medium
                        text-slate-900 outline-none
                        transition
                        placeholder:text-slate-400
                        ${
                            error
                                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                : 'border-slate-300 focus:border-[#0D6EFD] focus:ring-4 focus:ring-blue-100'
                        }
                    `}
                />
            </div>

            {error && (
                <p className="mt-2 px-4 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}

interface PasswordInputProps {
    id: string;
    label: string;
    value: string;
    placeholder: string;
    visible: boolean;
    error?: string;
    onToggle: () => void;
    onChange: (value: string) => void;
}

function PasswordInput({
    id,
    label,
    value,
    placeholder,
    visible,
    error,
    onToggle,
    onChange,
}: PasswordInputProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block text-sm font-semibold text-slate-700"
            >
                {label}
            </label>

            <div className="relative">
                <LockKeyhole
                    size={19}
                    className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                    id={id}
                    name={id}
                    type={
                        visible
                            ? 'text'
                            : 'password'
                    }
                    value={value}
                    onChange={(event) =>
                        onChange(event.target.value)
                    }
                    autoComplete="new-password"
                    placeholder={placeholder}
                    className={`
                        w-full rounded-full border
                        bg-transparent py-4 pl-14 pr-14
                        text-base font-medium
                        text-slate-900 outline-none
                        transition
                        placeholder:text-slate-400
                        ${
                            error
                                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                : 'border-slate-300 focus:border-[#0D6EFD] focus:ring-4 focus:ring-blue-100'
                        }
                    `}
                />

                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-blue-600"
                    aria-label={
                        visible
                            ? 'Hide password'
                            : 'Show password'
                    }
                >
                    {visible ? (
                        <EyeOff size={19} />
                    ) : (
                        <Eye size={19} />
                    )}
                </button>
            </div>

            {error && (
                <p className="mt-2 px-4 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}