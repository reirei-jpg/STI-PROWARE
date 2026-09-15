import {
    Search,
    ShoppingCart,
} from 'lucide-react';

import {
    Link,
    usePage,
} from '@inertiajs/react';

import type {
    PageProps as InertiaPageProps,
} from '@inertiajs/core';

import NotificationBell from '@/components/NotificationBell';
import NavbarAccountMenu from '@/components/NavbarAccountMenu';

interface StudentNavbarPageProps
    extends InertiaPageProps {
    cart?: {
        count: number;
    };
}

export default function StudentNavbar() {
    const page =
        usePage<StudentNavbarPageProps>();

    const cartCount =
        page.props.cart?.count ?? 0;

    return (
        <header
            className="
                fixed
                left-0
                right-0
                top-0
                z-20
                flex
                h-20
                items-center
                justify-between
                border-b
                border-slate-200
                bg-white
                px-5
                md:left-72
                md:px-8
            "
        >
            {/* LEFT SIDE */}

            <div className="min-w-0">
                <h2
                    className="
                        truncate
                        text-lg
                        font-bold
                        text-slate-900
                        md:text-xl
                    "
                >
                    PROWARE Merchandise
                </h2>

                <p
                    className="
                        mt-1
                        hidden
                        text-sm
                        text-slate-500
                        sm:block
                    "
                >
                    Order and track your STI merchandise
                </p>
            </div>

            {/* RIGHT SIDE */}

            <div
                className="
                    flex
                    shrink-0
                    items-center
                    gap-3
                    md:gap-4
                "
            >
                {/* SEARCH MERCHANDISE */}

                <Link
                    href="/student/dashboard#merchandise"
                    aria-label="Search merchandise"
                    title="Search Merchandise"
                    className="
                        hidden
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-xl
                        bg-slate-100
                        text-slate-600
                        transition
                        hover:bg-blue-50
                        hover:text-blue-600
                        sm:flex
                    "
                >
                    <Search size={20} />
                </Link>

                {/* CART */}

                <Link
                    href="/cart"
                    aria-label={`Shopping cart with ${cartCount} item${
                        cartCount === 1
                            ? ''
                            : 's'
                    }`}
                    title="My Cart"
                    className="
                        relative
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-xl
                        bg-slate-100
                        text-slate-600
                        transition
                        hover:bg-blue-50
                        hover:text-blue-600
                    "
                >
                    <ShoppingCart
                        size={20}
                    />

                    {cartCount > 0 && (
                        <span
                            className="
                                absolute
                                -right-2
                                -top-2
                                flex
                                min-h-6
                                min-w-6
                                items-center
                                justify-center
                                rounded-full
                                border-2
                                border-white
                                bg-red-500
                                px-1.5
                                text-[10px]
                                font-black
                                text-white
                                shadow-sm
                            "
                        >
                            {cartCount > 99
                                ? '99+'
                                : cartCount}
                        </span>
                    )}
                </Link>

                {/* NOTIFICATIONS */}

                <NotificationBell />

                {/* ACCOUNT MENU */}

                <NavbarAccountMenu
                    allowSwitchAccount
                />
            </div>
        </header>
    );
}