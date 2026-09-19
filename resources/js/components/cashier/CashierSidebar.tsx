import {
    Banknote,
    Hourglass,
    LayoutDashboard,
    ReceiptText,
    TrendingUp,
} from 'lucide-react';

import type {
    LucideIcon,
} from 'lucide-react';

import {
    Link,
    usePage,
} from '@inertiajs/react';

import SidebarBrand from '@/components/SidebarBrand';

import cashier from '@/routes/cashier';

interface MenuItem {
    name: string;
    icon: LucideIcon;
    link: string;
}

export default function CashierSidebar() {
    const { url } = usePage();

    const menus: MenuItem[] = [
        {
            name: 'Dashboard',
            icon: LayoutDashboard,
            link: cashier.dashboard.url(),
        },
        {
            name: 'Pending Payments',
            icon: Banknote,
            link: cashier.orders.index.url(),
        },
        {
            name: 'Waiting to Be Claimed',
            icon: Hourglass,
            link: '/cashier/unclaimed',
        },
        {
            name: 'Sales',
            icon: TrendingUp,
            link: cashier.sales.index.url(),
        },
        {
            name: 'Payment History',
            icon: ReceiptText,
            link: cashier.payments.index.url(),
        },
    ];

    return (
        <aside
            className="
                fixed
                inset-y-0
                left-0
                z-30
                hidden
                w-72
                flex-col
                overflow-y-auto
                bg-[#0D6EFD]
                px-5
                py-7
                text-white
                md:flex
            "
        >
            <SidebarBrand
                subtitle="Cashier Portal"
            />

            <div
                className="
                    mt-8
                    border-t
                    border-white/10
                "
            />

            <nav className="mt-6 space-y-1.5">
                {menus.map((item) => {
                    const Icon =
                        item.icon;

                    const active =
                        url === item.link
                        || url.startsWith(
                            `${item.link}/`,
                        );

                    return (
                        <Link
                            key={item.name}
                            href={item.link}
                            className={`
                                flex
                                items-center
                                gap-4
                                rounded-xl
                                px-4
                                py-3
                                text-sm
                                font-semibold
                                transition

                                ${
                                    active
                                        ? 'bg-white text-[#0D6EFD] shadow-sm'
                                        : 'text-blue-50 hover:bg-white/15 hover:text-white'
                                }
                            `}
                        >
                            <Icon
                                size={19}
                            />

                            <span>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto pt-10">
                <div
                    className="
                        border-t
                        border-white/10
                        pt-5
                    "
                >
                    <p
                        className="
                            px-3
                            text-xs
                            font-medium
                            text-blue-100
                        "
                    >
                        STI PROWARE
                    </p>

                    <p
                        className="
                            mt-1
                            px-3
                            text-[11px]
                            text-blue-200/70
                        "
                    >
                        Cashier Portal • Version 1.0
                    </p>
                </div>
            </div>
        </aside>
    );
}