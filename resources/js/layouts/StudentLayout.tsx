import type { ReactNode } from 'react';

import StudentNavbar from '@/components/student/StudentNavbar';
import StudentSidebar from '@/components/student/StudentSidebar';

interface StudentLayoutProps {
    children: ReactNode;
}

export default function StudentLayout({
    children,
}: StudentLayoutProps) {
    return (
        <div className="min-h-screen bg-[#F3F7FA]">
            <StudentSidebar />

            <StudentNavbar />

            <main className="min-h-screen px-5 pb-10 pt-28 md:ml-72 md:px-8">
                {children}
            </main>
        </div>
    );
}