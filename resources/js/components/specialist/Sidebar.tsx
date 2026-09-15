import {
    Boxes,
    ClipboardList,
    LayoutDashboard,
    PackageCheck,
    PackageSearch,
    ShoppingBag,
    Truck,
    History,
} from 'lucide-react';

import {
    Link,
    usePage,
} from '@inertiajs/react';

import type {
    LucideIcon,
} from 'lucide-react';

import SidebarBrand from '@/components/SidebarBrand';

import specialist from '@/routes/specialist';

interface MenuItem {
    name: string;
    icon: LucideIcon;
    link: string;
    enabled: boolean;
}

export default function SpecialistSidebar() {
    const { url } = usePage();

    const menus: MenuItem[] = [
        {
            name: 'Dashboard',
            icon: LayoutDashboard,
            link: specialist.dashboard.url(),
            enabled: true,
        },
        {
            name: 'Order Fulfillment',
            icon: PackageCheck,
            link: specialist.orders.index.url(),
            enabled: true,
        },
        {
            name: 'Release History',
            icon: History,
            link: specialist.releases.index.url(),
            enabled: true,
        },
        {
            name: 'Inventory',
            icon: Boxes,
            link: '/staff/inventory',
            enabled: true,
        },
        {
            name: 'Receive Stock',
            icon: Truck,
            link: '/staff/stock-receipts/create',
            enabled: true,
        },
        {
            name: 'Receipt History',
            icon: PackageSearch,
            link: '/staff/stock-receipts',
            enabled: true,
        },
        {
            name: 'Assisted Orders',
            icon: ClipboardList,
            link: '/specialist/assisted-orders',
            enabled: false,
        },
        {
            name: 'Browse Merchandise',
            icon: ShoppingBag,
            link: '/catalog',
            enabled: false,
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
                subtitle="Specialist Workspace"
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
                    item.link ===
                    '/staff/stock-receipts'
                        ? url === item.link
                        : url === item.link
                        || url.startsWith(
                            `${item.link}/`,
                        );

                    if (!item.enabled) {
                        return (
                            <div
                                key={item.name}
                                title="This module will be available later."
                                className="
                                    flex
                                    cursor-not-allowed
                                    items-center
                                    gap-4
                                    rounded-xl
                                    px-4
                                    py-3
                                    text-sm
                                    font-medium
                                    text-blue-100/50
                                "
                            >
                                <Icon
                                    size={19}
                                />

                                <span className="flex-1">
                                    {item.name}
                                </span>

                                <span
                                    className="
                                        rounded-full
                                        bg-white/10
                                        px-2
                                        py-1
                                        text-[9px]
                                        font-black
                                        uppercase
                                        tracking-wide
                                        text-blue-100/70
                                    "
                                >
                                    Soon
                                </span>
                            </div>
                        );
                    }

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
                        Specialist Access • Version 1.0
                    </p>
                </div>
            </div>
        </aside>
    );
}