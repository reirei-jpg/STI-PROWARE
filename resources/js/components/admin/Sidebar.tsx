import {
    Link,
    usePage,
} from '@inertiajs/react';
import {
    ClipboardList,
    Clock,
    FileText,
    History,
    LayoutDashboard,
    Package,
    ReceiptText,
    Settings,
    Shirt,
    ShoppingCart,
    Users,
} from 'lucide-react';


import type {
    LucideIcon,
} from 'lucide-react';

import SidebarBrand from '@/components/SidebarBrand';

interface MenuItem {
    name: string;
    icon: LucideIcon;
    link: string;
    enabled: boolean;
}

export default function Sidebar() {
    const { url } = usePage();

    const menus: MenuItem[] = [
        {
            name: 'Dashboard',
            icon: LayoutDashboard,
            link: '/admin/dashboard',
            enabled: true,
        },

        {
            name: 'Products',
            icon: Shirt,
            link: '/admin/products',
            enabled: true,
        },

        {
            name: 'Categories',
            icon: ClipboardList,
            link: '/admin/categories',
            enabled: true,
        },

        {
            name: 'Inventory',
            icon: Package,
            link: '/staff/inventory',
            enabled: true,
        },

        {
            name: 'Purchase Orders',
            icon: ClipboardList,
            link: '/admin/purchase-orders',
            enabled: true,
        },

        /*
        |--------------------------------------------------------------------------
        | Receiving Monitoring
        |--------------------------------------------------------------------------
        |
        | Admin can monitor receiving activity.
        |
        | The actual "Receive Stock" operation is intentionally NOT shown here.
        | PO receiving will belong to Specialist later.
        |
        */

        {
            name: 'Receipt History',
            icon: ReceiptText,
            link: '/staff/stock-receipts',
            enabled: true,
        },

        /*
        |--------------------------------------------------------------------------
        | Sales Monitoring
        |--------------------------------------------------------------------------
        |
        | Admin monitors sales performance.
        |
        | Cashier performs actual payment/sales operations later.
        |
        */

        {
            name: 'Sales Monitoring',
            icon: ShoppingCart,
            link: '/admin/sales',
            enabled: true,
        },

        {
            name: 'Orders',
            icon: ClipboardList,
            link: '/admin/orders',
            enabled: true,
        },

        {
            name: 'Waiting List',
            icon: Clock,
            link: '/staff/waiting-list',
            enabled: true,
        },

        {
            name: 'Reports & Analytics',
            icon: FileText,
            link: '/admin/reports',
            enabled: true,
        },

        {
            name: 'Audit Logs',
            icon: History,
            link: '/admin/audit-logs',
            enabled: true,
        },

        /*
        |--------------------------------------------------------------------------
        | Employee Management
        |--------------------------------------------------------------------------
        |
        | The route remains /admin/users for now.
        |
        | Phase 2 will introduce hierarchy,
        | position/access level, supervisor, etc.
        |
        */

        {
            name: 'Employee Management',
            icon: Users,
            link: '/admin/users',
            enabled: true,
        },

        {
            name: 'Settings',
            icon: Settings,
            link: '/admin/settings',
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
                subtitle="Admin Control Center"
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

                    /*
                    |--------------------------------------------------------------------------
                    | Active Menu State
                    |--------------------------------------------------------------------------
                    |
                    | Receipt History needs exact matching so that future
                    | specialist receiving routes do not incorrectly mark
                    | this Admin monitoring item as active.
                    |
                    */

                    const active =
                        item.link ===
                        '/staff/stock-receipts'
                            ? url ===
                                item.link
                            : url ===
                                  item.link
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
                        Admin Control Center • Version 1.0
                    </p>
                </div>
            </div>
        </aside>
    );
}