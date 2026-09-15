import {
    Eye,
    EyeOff,
    KeyRound,
    LockKeyhole,
    ShieldCheck,
} from 'lucide-react';

import {
    Head,
    useForm,
} from '@inertiajs/react';

import {
    useState,
} from 'react';

interface ChangePasswordPageProps {
    user: {
        name: string;
        email: string;
        role: string;
    };
}

interface PasswordForm {
    password: string;
    password_confirmation: string;
}

export default function ChangeTemporaryPassword({
    user,
}: ChangePasswordPageProps) {
    const [
        showPassword,
        setShowPassword,
    ] = useState(false);

    const [
        showConfirmation,
        setShowConfirmation,
    ] = useState(false);

    const form =
        useForm<PasswordForm>({
            password: '',
            password_confirmation: '',
        });

    const submit = (
        event: React.FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        form.patch(
            '/password/change-required',
            {
                preserveScroll: true,

                onSuccess: () => {
                    form.reset();
                },
            },
        );
    };

    return (
        <>
            <Head title="Set New Password" />

            <main
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    bg-[#F3F7FA]
                    px-5
                    py-10
                "
            >
                <div className="w-full max-w-lg">
                    {/* BRAND */}
                    <div className="mb-6 text-center">
                        <div
                            className="
                                mx-auto
                                flex
                                h-14
                                w-14
                                items-center
                                justify-center
                                rounded-2xl
                                bg-[#0D6EFD]
                                text-white
                                shadow-lg
                                shadow-blue-500/20
                            "
                        >
                            <KeyRound
                                size={26}
                            />
                        </div>

                        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                            STI PROWARE
                        </p>

                        <h1 className="mt-2 text-3xl font-black text-slate-900">
                            Create Your Password
                        </h1>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            Your current password was
                            issued temporarily by the
                            administrator. Create your
                            own password before
                            continuing to PROWARE.
                        </p>
                    </div>

                    {/* CARD */}
                    <section
                        className="
                            overflow-hidden
                            rounded-3xl
                            border
                            border-slate-200
                            bg-white
                            shadow-xl
                            shadow-slate-200/60
                        "
                    >
                        {/* USER */}
                        <div
                            className="
                                border-b
                                border-slate-100
                                bg-blue-50/50
                                px-6
                                py-5
                            "
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-blue-600
                                        text-white
                                    "
                                >
                                    <ShieldCheck
                                        size={19}
                                    />
                                </div>

                                <div className="min-w-0">
                                    <p className="truncate font-black text-slate-900">
                                        {user.name}
                                    </p>

                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form
                            onSubmit={submit}
                            className="p-6"
                        >
                            {/* PASSWORD */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="
                                        text-sm
                                        font-black
                                        text-slate-700
                                    "
                                >
                                    New Password
                                </label>

                                <div className="relative mt-2">
                                    <LockKeyhole
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
                                        id="password"
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={
                                            form.data
                                                .password
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            form.setData(
                                                'password',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        autoComplete="new-password"
                                        autoFocus
                                        placeholder="Enter your new password"
                                        className="
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            py-3
                                            pl-11
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
                                                (
                                                    current,
                                                ) =>
                                                    !current,
                                            )
                                        }
                                        className="
                                            absolute
                                            right-4
                                            top-1/2
                                            -translate-y-1/2
                                            text-slate-400
                                            transition
                                            hover:text-slate-700
                                        "
                                    >
                                        {showPassword ? (
                                            <EyeOff
                                                size={
                                                    18
                                                }
                                            />
                                        ) : (
                                            <Eye
                                                size={
                                                    18
                                                }
                                            />
                                        )}
                                    </button>
                                </div>

                                {form.errors
                                    .password && (
                                    <p className="mt-2 text-xs font-bold text-red-600">
                                        {
                                            form
                                                .errors
                                                .password
                                        }
                                    </p>
                                )}
                            </div>

                            {/* CONFIRM */}
                            <div className="mt-5">
                                <label
                                    htmlFor="password_confirmation"
                                    className="
                                        text-sm
                                        font-black
                                        text-slate-700
                                    "
                                >
                                    Confirm New Password
                                </label>

                                <div className="relative mt-2">
                                    <LockKeyhole
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
                                        id="password_confirmation"
                                        type={
                                            showConfirmation
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
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        autoComplete="new-password"
                                        placeholder="Re-enter your new password"
                                        className="
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            py-3
                                            pl-11
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
                                            setShowConfirmation(
                                                (
                                                    current,
                                                ) =>
                                                    !current,
                                            )
                                        }
                                        className="
                                            absolute
                                            right-4
                                            top-1/2
                                            -translate-y-1/2
                                            text-slate-400
                                            transition
                                            hover:text-slate-700
                                        "
                                    >
                                        {showConfirmation ? (
                                            <EyeOff
                                                size={
                                                    18
                                                }
                                            />
                                        ) : (
                                            <Eye
                                                size={
                                                    18
                                                }
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* INFO */}
                            <div
                                className="
                                    mt-5
                                    rounded-2xl
                                    border
                                    border-blue-100
                                    bg-blue-50
                                    px-4
                                    py-3
                                "
                            >
                                <p className="text-xs leading-5 text-blue-700">
                                    Your new password
                                    must be different
                                    from the temporary
                                    password provided by
                                    the administrator.
                                    After changing it,
                                    you will be sent to
                                    your PROWARE
                                    dashboard.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={
                                    form.processing
                                    || !form.data
                                        .password
                                    || !form.data
                                        .password_confirmation
                                }
                                className="
                                    mt-6
                                    inline-flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-[#0D6EFD]
                                    px-5
                                    py-3.5
                                    text-sm
                                    font-black
                                    text-white
                                    shadow-lg
                                    shadow-blue-500/20
                                    transition
                                    hover:bg-blue-700
                                    disabled:cursor-not-allowed
                                    disabled:opacity-60
                                "
                            >
                                <KeyRound
                                    size={18}
                                />

                                {form.processing
                                    ? 'Saving Password...'
                                    : 'Set New Password'}
                            </button>
                        </form>
                    </section>
                </div>
            </main>
        </>
    );
}