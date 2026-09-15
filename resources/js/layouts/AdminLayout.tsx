import type { ReactNode } from 'react';

import Navbar from '@/components/admin/Navbar';
import Sidebar from '@/components/admin/Sidebar';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({
    children,
}: AdminLayoutProps) {
    return (
        <div className="min-h-screen bg-[#F3F7FA]">
            <Sidebar />

            <Navbar />

            <main
                className="
                    ml-72
                    min-h-screen
                    px-8
                    pb-10
                    pt-28
                "
            >
                {children}
            </main>
        </div>
    );
}