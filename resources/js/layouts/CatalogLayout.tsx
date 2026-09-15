import type {
    ReactNode,
} from 'react';

import {
    usePage,
} from '@inertiajs/react';

import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';
import StudentLayout from '@/layouts/StudentLayout';

interface CatalogLayoutProps {
    children: ReactNode;
}

interface SharedPageProps {
    [key: string]: unknown;

    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
            role: string;
        };
    };
}

export default function CatalogLayout({
    children,
}: CatalogLayoutProps) {
    const page =
        usePage<SharedPageProps>();

    const role =
        page.props.auth?.user?.role
        ?? null;

    if (role === 'admin') {
        return (
            <AdminLayout>
                {children}
            </AdminLayout>
        );
    }

    if (role === 'specialist') {
        return (
            <SpecialistLayout>
                {children}
            </SpecialistLayout>
        );
    }

  if (role === 'student') {
    return (
        <StudentLayout>
            {children}
        </StudentLayout>
    );
}
    return (
        <div className="min-h-screen bg-[#F3F7FA]">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-sm font-black text-blue-700">
                            STI
                        </div>

                        <div>
                            <p className="text-xl font-black text-slate-900">
                                PROWARE
                            </p>

                            <p className="text-xs text-slate-500">
                                Merchandise Catalog
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800">
                            {page.props.auth?.user?.name
                                ?? 'PROWARE User'}
                        </p>

                        <p className="mt-1 text-xs capitalize text-slate-500">
                            {role ?? 'authenticated user'}
                        </p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
                {children}
            </main>
        </div>
    );
}