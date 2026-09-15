import {
    Bell,
    Search,
} from 'lucide-react';

import NavbarAccountMenu from '@/components/NavbarAccountMenu';

export default function Navbar() {
    return (
        <header
            className="
                fixed
                left-0
                right-0
                top-0
                z-50
                flex
                h-20
                items-center
                justify-between
                border-b
                border-slate-200
                bg-white
                px-5
                shadow-sm
                md:left-72
                md:px-8
            "
        >
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
                    STI PROWARE Admin Dashboard
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
                    Merchandise and Inventory
                    Management System
                </p>
            </div>

            <div
                className="
                    flex
                    shrink-0
                    items-center
                    gap-3
                    md:gap-4
                "
            >
                <button
                    type="button"
                    aria-label="Search"
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
                        hover:bg-slate-200
                        sm:flex
                    "
                >
                    <Search
                        size={20}
                    />
                </button>

                <button
                    type="button"
                    aria-label="Notifications"
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
                        hover:bg-slate-200
                    "
                >
                    <Bell
                        size={20}
                    />

                    <span
                        className="
                            absolute
                            right-2
                            top-2
                            h-3
                            w-3
                            rounded-full
                            border-2
                            border-white
                            bg-yellow-400
                        "
                    />
                </button>

                <NavbarAccountMenu />
            </div>
        </header>
    );
}