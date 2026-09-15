import {
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
} from 'lucide-react';

import {
    Head,
    useForm,
} from '@inertiajs/react';

import {
    type FormEvent,
    useState,
} from 'react';

interface LoginFormData {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginPageProps {
    status?: string;
    canResetPassword?: boolean;
}

export default function Login({
    status,
    canResetPassword = false,
}: LoginPageProps) {
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<LoginFormData>({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post('/login', {
            preserveScroll: true,

            onFinish: () => {
                form.reset('password');
            },
        });
    };

    return (
        <>
            <Head title="PROWARE Login" />

            <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 py-10">
                {/* Top blue background */}
                <div className="absolute inset-x-0 top-0 h-20 bg-[#0D6EFD] sm:h-28" />

                {/* Top-right yellow decoration */}
                <div
                    className="
                        absolute
                        right-0
                        top-14
                        hidden
                        h-72
                        w-32
                        rounded-l-[3rem]
                        bg-yellow-400
                        md:block
                        lg:w-44
                    "
                />

                {/* Right blue decoration */}
                <div
                    className="
                        absolute
                        right-0
                        top-[26rem]
                        hidden
                        h-40
                        w-32
                        bg-[#0D6EFD]
                        md:block
                        lg:w-44
                    "
                />

                {/* Left blue decoration */}
                <div
                    className="
                        absolute
                        bottom-32
                        left-0
                        hidden
                        h-44
                        w-28
                        bg-[#0D6EFD]
                        md:block
                        lg:w-36
                    "
                />

                {/* Bottom-left yellow decoration */}
                <div
                    className="
                        absolute
                        -bottom-16
                        left-24
                        hidden
                        h-48
                        w-[28rem]
                        rounded-t-[4rem]
                        bg-yellow-400
                        md:block
                    "
                />

                {/* Bottom-right blue decoration */}
                <div
                    className="
                        absolute
                        -bottom-20
                        right-0
                        hidden
                        h-52
                        w-[25rem]
                        rounded-tl-[4rem]
                        bg-[#0D6EFD]
                        md:block
                    "
                />

                {/* Main white login panel */}
                <section
                    className="
                        relative
                        z-10
                        w-full
                        max-w-4xl
                        rounded-[2.5rem]
                        border
                        border-slate-100
                        bg-white
                        px-6
                        py-12
                        shadow-[0_30px_70px_rgba(0,0,0,.12)]
                        shadow-slate-300/40
                        sm:px-12
                        md:min-h-[620px]
                        md:px-20
                        md:py-20
                        lg:px-44
                    "
                >
                    <div className="mx-auto w-full max-w-md">
                        {/* Logo and title */}
                        <div className="text-center">
                            <a
                                href="/"
                                className="inline-flex items-center justify-center gap-3"
                            >
                                <div
                                    className="
                                        flex
                                        h-12
                                        w-12
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-yellow-400
                                        text-sm
                                        font-black
                                        text-blue-700
                                        shadow-md
                                    "
                                >
                                    STI
                                </div>

                                <span className="text-2xl font-bold text-slate-950">
                                    PROWARE
                                </span>
                            </a>

                            <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-950">
                                STI PROWARE
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                Merchandise and Inventory Management System
                            </p>
                        </div>

                        {status && (
                            <div
                                className="
                                    mt-7
                                    rounded-xl
                                    border
                                    border-green-200
                                    bg-green-50
                                    px-4
                                    py-3
                                    text-sm
                                    text-green-700
                                "
                            >
                                {status}
                            </div>
                        )}

                        <form
                            onSubmit={submit}
                            className="mt-10 space-y-7"
                        >
                            {/* Email */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="sr-only"
                                >
                                    Email address
                                </label>

                                <div className="relative">
                                    <Mail
                                        size={19}
                                        className="
                                            pointer-events-none
                                            absolute
                                            left-5
                                            top-1/2
                                            -translate-y-1/2
                                            text-slate-500
                                        "
                                    />

                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={form.data.email}
                                        onChange={(event) =>
                                            form.setData(
                                                'email',
                                                event.target.value,
                                            )
                                        }
                                        autoComplete="email"
                                        autoFocus
                                        placeholder="Email address"
                                        className={`
    w-full
    rounded-full
    border
    bg-transparent
    py-4
    pl-14
    pr-5
    text-base
    font-medium
    text-slate-900
    outline-none
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

                                {form.errors.email && (
                                    <p className="mt-2 px-4 text-sm text-red-600">
                                        {form.errors.email}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="sr-only"
                                >
                                    Password
                                </label>

                                <div className="relative">
                                    <LockKeyhole
                                        size={19}
                                        className="
                                            pointer-events-none
                                            absolute
                                            left-5
                                            top-1/2
                                            -translate-y-1/2
                                            text-slate-500
                                        "
                                    />

                                    <input
                                        id="password"
                                        name="password"
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={form.data.password}
                                        onChange={(event) =>
                                            form.setData(
                                                'password',
                                                event.target.value,
                                            )
                                        }
                                        autoComplete="current-password"
                                        placeholder="Password"
                                        className={`
    w-full
    rounded-full
    border
    bg-transparent
    py-4
    pl-14
    pr-14
    text-base
    font-medium
    text-slate-900
    outline-none
    transition
    placeholder:text-slate-400
    ${
        form.errors.password
            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
            : 'border-slate-300 focus:border-[#0D6EFD] focus:ring-4 focus:ring-blue-100'
    }
`}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(
                                                (current) => !current,
                                            )
                                        }
                                        className="
                                            absolute
                                            right-5
                                            top-1/2
                                            -translate-y-1/2
                                            text-slate-400
                                            transition
                                            hover:text-blue-600
                                        "
                                        aria-label={
                                            showPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={19} />
                                        ) : (
                                            <Eye size={19} />
                                        )}
                                    </button>
                                </div>

                                {form.errors.password && (
                                    <p className="mt-2 px-4 text-sm text-red-600">
                                        {form.errors.password}
                                    </p>
                                )}
                            </div>

                            {/* Remember and forgot password */}
                            <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={form.data.remember}
                                        onChange={(event) =>
                                            form.setData(
                                                'remember',
                                                event.target.checked,
                                            )
                                        }
                                        className="
                                            h-4
                                            w-4
                                            rounded
                                            border-slate-300
                                            text-blue-600
                                            focus:ring-blue-500
                                        "
                                    />

                                    Remember me
                                </label>

                                {canResetPassword && (
                                    <a
                                        href="/forgot-password"
                                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                                    >
                                        Forgot password?
                                    </a>
                                )}
                            </div>

                            {/* Login button */}
                            <button
                                type="submit"
                                disabled={form.processing}
                               className="
    mt-3
    flex
    w-full
    items-center
    justify-center
    rounded-full
    bg-gradient-to-r
    from-[#005BFF]
    via-[#0D6EFD]
    to-[#0045CC]
    px-6
    py-4
    text-sm
    font-bold
    text-white
    shadow-lg
    shadow-blue-500/30
    transition
    hover:-translate-y-0.5
    hover:from-blue-600
    hover:to-blue-800
    focus:outline-none
    focus:ring-4
    focus:ring-blue-200
    disabled:cursor-not-allowed
    disabled:opacity-60
"
                            >
                                {form.processing
                                    ? 'Logging in...'
                                    : 'Login'}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-sm text-slate-500">
                                Student without an account?{' '}
                                <a
                                    href="/register"
                                    className="font-semibold text-blue-600 hover:text-blue-700"
                                >
                                    Register
                                </a>
                            </p>

                            <a
                                href="/"
                                className="mt-4 inline-block text-sm text-slate-400 transition hover:text-slate-700"
                            >
                                Return to home
                            </a>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}