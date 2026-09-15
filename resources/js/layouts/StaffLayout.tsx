import type { ReactNode } from 'react';

import { usePage } from '@inertiajs/react';

import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';

interface StaffLayoutProps {
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

export default function StaffLayout({
    children,
}: StaffLayoutProps) {
    const page = usePage<SharedPageProps>();

    const role =
        page.props.auth?.user?.role ?? null;

    if (role === 'specialist') {
        return (
            <SpecialistLayout>
                {children}
            </SpecialistLayout>
        );
    }

    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    );
}