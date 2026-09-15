import {
    Banknote,
} from 'lucide-react';

import NotificationBell from '@/components/NotificationBell';
import NavbarAccountMenu from '@/components/NavbarAccountMenu';

export default function CashierNavbar() {
    return (
        <header
            className="
                fixed left-0 right-0 top-0 z-20
                flex h-20 items-center
                justify-between
                border-b border-slate-200
                bg-white px-5
                md:left-72 md:px-8
            "
        >
            <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-900 md:text-xl">
                    PROWARE Cashier Dashboard
                </h2>

                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                    Payment Verification and
                    Order Processing
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 md:gap-4">
                <div
                    className="
                        hidden h-11 items-center
                        gap-2 rounded-xl
                        bg-blue-50 px-4
                        text-sm font-bold
                        text-blue-600
                        sm:flex
                    "
                >
                    <Banknote size={18} />

                    Cashier
                </div>

                <NotificationBell />

                <NavbarAccountMenu />
            </div>
        </header>
    );
}