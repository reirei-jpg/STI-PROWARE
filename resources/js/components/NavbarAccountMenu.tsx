import {
    ChevronDown,
    LogOut,
    RefreshCcw,
    UserRound,
} from 'lucide-react';

import {
    router,
    usePage,
} from '@inertiajs/react';

import {
    useEffect,
    useRef,
    useState,
} from 'react';

interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface SharedPageProps {
    auth?: {
        user?: AuthUser | null;
    };

    [key: string]: unknown;
}

interface NavbarAccountMenuProps {
    allowSwitchAccount?: boolean;
}

export default function NavbarAccountMenu({
    allowSwitchAccount = false,
}: NavbarAccountMenuProps) {
    const page =
        usePage<SharedPageProps>();

    const user =
        page.props.auth?.user ?? null;

    const [
        menuOpen,
        setMenuOpen,
    ] = useState(false);

    const [
        processing,
        setProcessing,
    ] = useState(false);

    const menuRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const initials =
        user?.name
            ? user.name
                  .split(' ')
                  .filter(Boolean)
                  .map(
                      (part) =>
                          part.charAt(0),
                  )
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
            : 'ST';

    useEffect(() => {
        const handleOutsideClick = (
            event: MouseEvent,
        ) => {
            if (
                menuRef.current
                && !menuRef.current.contains(
                    event.target as Node,
                )
            ) {
                setMenuOpen(false);
            }
        };

        const handleEscape = (
            event: KeyboardEvent,
        ) => {
            if (
                event.key === 'Escape'
            ) {
                setMenuOpen(false);
            }
        };

        document.addEventListener(
            'mousedown',
            handleOutsideClick,
        );

        document.addEventListener(
            'keydown',
            handleEscape,
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                handleOutsideClick,
            );

            document.removeEventListener(
                'keydown',
                handleEscape,
            );
        };
    }, []);

    const logout = () => {
        if (processing) {
            return;
        }

        setProcessing(true);
        setMenuOpen(false);

        router.post(
            '/logout',
            {},
            {
                preserveScroll: false,

                onSuccess: () => {
                    router.visit('/');
                },

                onFinish: () => {
                    setProcessing(false);
                },
            },
        );
    };

    const switchAccount = () => {
        if (
            processing
            || !allowSwitchAccount
        ) {
            return;
        }

        setProcessing(true);
        setMenuOpen(false);

        router.post(
            '/logout',
            {},
            {
                preserveScroll: false,

                onSuccess: () => {
                    router.visit(
                        '/login',
                    );
                },

                onFinish: () => {
                    setProcessing(false);
                },
            },
        );
    };

    return (
        <div
            ref={menuRef}
            className="relative"
        >
            <button
                type="button"
                onClick={() =>
                    setMenuOpen(
                        (current) =>
                            !current,
                    )
                }
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="
                    flex items-center gap-3
                    rounded-xl
                    border border-slate-200
                    bg-white px-2.5 py-2
                    text-left transition
                    hover:border-blue-200
                    hover:bg-blue-50/50
                "
            >
                <div
                    className="
                        flex h-10 w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-[#0D6EFD]
                        text-sm font-black
                        text-white
                    "
                >
                    {initials}
                </div>

                <div className="hidden min-w-0 lg:block">
                    <p className="max-w-40 truncate text-sm font-semibold text-slate-900">
                        {user?.name
                            ?? 'PROWARE User'}
                    </p>

                    <p className="max-w-40 truncate text-xs capitalize text-slate-500">
                        {formatRole(
                            user?.role
                            ?? 'user',
                        )}
                    </p>
                </div>

                <ChevronDown
                    size={16}
                    className={`
                        hidden shrink-0
                        text-slate-400
                        transition
                        sm:block

                        ${
                            menuOpen
                                ? 'rotate-180'
                                : ''
                        }
                    `}
                />
            </button>

            {menuOpen && (
                <div
                    role="menu"
                    className="
                        absolute right-0
                        mt-3 w-72
                        overflow-hidden
                        rounded-2xl
                        border border-slate-200
                        bg-white
                        shadow-xl
                        shadow-slate-900/10
                    "
                >
                    <div className="border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="
                                    flex h-11 w-11
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-blue-50
                                    text-blue-700
                                "
                            >
                                <UserRound
                                    size={21}
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">
                                    {user?.name
                                        ?? 'PROWARE User'}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                    {user?.email
                                        ?? 'No email available'}
                                </p>
                            </div>
                        </div>

                        <span
                            className="
                                mt-4 inline-flex
                                rounded-full
                                bg-blue-100
                                px-3 py-1
                                text-[10px]
                                font-black uppercase
                                tracking-wide
                                text-blue-700
                            "
                        >
                            {formatRole(
                                user?.role
                                ?? 'user',
                            )}
                        </span>
                    </div>

                    <div className="p-2">
                        {allowSwitchAccount && (
                            <button
                                type="button"
                                role="menuitem"
                                onClick={
                                    switchAccount
                                }
                                disabled={
                                    processing
                                }
                                className="
                                    flex w-full
                                    items-center gap-3
                                    rounded-xl
                                    px-3 py-3
                                    text-left
                                    text-sm font-semibold
                                    text-slate-700
                                    transition
                                    hover:bg-blue-50
                                    hover:text-blue-700
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                <RefreshCcw
                                    size={17}
                                />

                                Switch Account
                            </button>
                        )}

                        <button
                            type="button"
                            role="menuitem"
                            onClick={logout}
                            disabled={
                                processing
                            }
                            className="
                                flex w-full
                                items-center gap-3
                                rounded-xl
                                px-3 py-3
                                text-left
                                text-sm font-semibold
                                text-red-600
                                transition
                                hover:bg-red-50
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            <LogOut
                                size={17}
                            />

                            {processing
                                ? 'Signing out...'
                                : 'Logout'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatRole(
    role: string,
): string {
    return role
        .replace(/_/g, ' ')
        .replace(
            /\b\w/g,
            (character) =>
                character.toUpperCase(),
        );
}