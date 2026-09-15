


import NotificationBell from '@/components/NotificationBell';
import NavbarAccountMenu from '@/components/NavbarAccountMenu';

export default function SpecialistNavbar() {
    return (
        <header
            className="
                fixed left-0 right-0 top-0 z-20
                flex h-20 items-center
                justify-between
                border-b border-slate-200
                bg-white px-5
                shadow-sm
                md:left-72 md:px-8
            "
        >
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                    Specialist Workspace
                </p>

                <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                    Inventory and merchandise
                    fulfillment operations
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
                <NotificationBell />

                <NavbarAccountMenu />
            </div>
        </header>
    );
}