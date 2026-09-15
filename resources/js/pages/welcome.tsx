import {
    ArrowRight,
    Boxes,
    CheckCircle2,
    CreditCard,
    PackageCheck,
    QrCode,
    ShieldCheck,
    ShoppingBag,
    UserRound,
} from 'lucide-react';

import type {
    LucideIcon,
} from 'lucide-react';

import {
    Head,
    Link,
    router,
    usePage,
} from '@inertiajs/react';

import type {
    PageProps as InertiaPageProps,
} from '@inertiajs/core';

type UserRole =
    | 'admin'
    | 'student'
    | 'specialist'
    | 'cashier';

interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
}

interface WelcomePageProps
    extends InertiaPageProps {
    auth?: {
        user?: AuthUser | null;
    };
}

interface FeatureCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
}

interface FlowStepProps {
    number: string;
    title: string;
    description: string;
    icon: LucideIcon;
}

export default function Welcome() {
    const { auth } =
        usePage<WelcomePageProps>().props;

    const user =
        auth?.user ?? null;

    const dashboardUrl =
        getDashboardUrl(
            user?.role,
        );

    const switchAccount = () => {
        router.post(
            '/logout',
            {},
            {
                onSuccess: () => {
                    router.visit(
                        '/login',
                    );
                },
            },
        );
    };

    return (
        <>
            <Head title="STI PROWARE" />

            <div className="min-h-screen bg-[#F3F7FA] text-slate-900">
                {/* HEADER */}
                <header className="border-b border-slate-200 bg-white">
                    <div
                        className="
                            mx-auto
                            flex max-w-7xl
                            flex-wrap
                            items-center
                            justify-between
                            gap-4
                            px-5 py-4
                            sm:px-6
                            lg:px-8
                        "
                    >
                        <Link
                            href="/"
                            className="flex min-w-0 items-center gap-3"
                        >
                            <div
                                className="
                                    h-12 w-12
                                    shrink-0
                                    overflow-hidden
                                    rounded-xl
                                "
                            >
                                <img
                                    src="/images/sti-logo.png"
                                    alt="STI College"
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="text-xl font-black tracking-tight text-[#0D6EFD] sm:text-2xl">
                                    PROWARE
                                </p>

                                <p className="hidden truncate text-xs text-slate-500 sm:block">
                                    Merchandise & Inventory Management System
                                </p>
                            </div>
                        </Link>

                        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                            {user ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={
                                            switchAccount
                                        }
                                        className="
                                            rounded-xl
                                            border
                                            border-slate-300
                                            bg-white
                                            px-4 py-2.5
                                            text-xs
                                            font-bold
                                            text-slate-700
                                            transition
                                            hover:border-blue-300
                                            hover:bg-blue-50
                                            sm:px-5
                                            sm:text-sm
                                        "
                                    >
                                        Switch Account
                                    </button>

                                    <Link
                                        href={
                                            dashboardUrl
                                        }
                                        className="
                                            inline-flex
                                            items-center
                                            gap-2
                                            rounded-xl
                                            bg-[#0D6EFD]
                                            px-4 py-2.5
                                            text-xs
                                            font-bold
                                            text-white
                                            transition
                                            hover:bg-blue-700
                                            sm:px-5
                                            sm:text-sm
                                        "
                                    >
                                        Dashboard

                                        <ArrowRight
                                            size={16}
                                        />
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="
                                            rounded-xl
                                            border
                                            border-slate-300
                                            bg-white
                                            px-4 py-2.5
                                            text-xs
                                            font-bold
                                            text-slate-700
                                            transition
                                            hover:border-blue-300
                                            hover:bg-blue-50
                                            sm:px-5
                                            sm:text-sm
                                        "
                                    >
                                        Login
                                    </Link>

                                    <Link
                                        href="/register"
                                        className="
                                            rounded-xl
                                            bg-[#0D6EFD]
                                            px-4 py-2.5
                                            text-xs
                                            font-bold
                                            text-white
                                            transition
                                            hover:bg-blue-700
                                            sm:px-5
                                            sm:text-sm
                                        "
                                    >
                                        Student Registration
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <main>
                    {/* HERO */}
                    <section
                        className="
                            mx-auto
                            grid
                            max-w-7xl
                            items-start
                            gap-10
                            px-5
                            pb-14
                            pt-8
                            sm:px-6
                            sm:pb-16
                            sm:pt-10
                            lg:grid-cols-2
                            lg:items-center
                            lg:gap-14
                            lg:px-8
                            lg:pb-20
                            lg:pt-12
                        "
                    >
                        <div>
                            <div
                                className="
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-full
                                    border
                                    border-blue-200
                                    bg-blue-50
                                    px-4 py-2
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-blue-700
                                    sm:text-sm
                                "
                            >
                                <QrCode size={17} />

                                Centralized QR Transaction
                            </div>

                            <h1
                                className="
                                    mt-6
                                    max-w-3xl
                                    text-4xl
                                    font-black
                                    leading-[1.08]
                                    tracking-tight
                                    text-slate-950
                                    sm:text-5xl
                                    lg:text-6xl
                                "
                            >
                                One order.
                                <span className="block text-[#0D6EFD]">
                                    One QR.
                                </span>
                                One connected transaction.
                            </h1>

                            <p
                                className="
                                    mt-6
                                    max-w-xl
                                    text-base
                                    leading-7
                                    text-slate-600
                                    sm:text-lg
                                    sm:leading-8
                                "
                            >
                                STI PROWARE connects student
                                ordering, cashier payment
                                verification, specialist
                                fulfillment, and inventory
                                management through one
                                centralized transaction flow.
                            </p>

                            {user && (
                                <div
                                    className="
                                        mt-7
                                        flex
                                        max-w-xl
                                        items-start
                                        gap-3
                                        rounded-2xl
                                        border
                                        border-blue-200
                                        bg-blue-50
                                        p-4
                                    "
                                >
                                    <UserRound
                                        size={20}
                                        className="mt-0.5 shrink-0 text-blue-600"
                                    />

                                    <div>
                                        <p className="text-sm font-bold text-slate-900">
                                            Welcome back,{' '}
                                            {user.name}
                                        </p>

                                        <p className="mt-1 text-xs capitalize text-slate-500">
                                            Signed in as{' '}
                                            {
                                                user.role
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div
                                className="
                                    mt-8
                                    flex
                                    flex-col
                                    gap-3
                                    sm:flex-row
                                    sm:flex-wrap
                                "
                            >
                                {user ? (
                                    <Link
                                        href={
                                            dashboardUrl
                                        }
                                        className="
                                            inline-flex
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-xl
                                            bg-[#0D6EFD]
                                            px-6
                                            py-3.5
                                            text-sm
                                            font-black
                                            text-white
                                            shadow-lg
                                            shadow-blue-500/20
                                            transition
                                            hover:-translate-y-0.5
                                            hover:bg-blue-700
                                        "
                                    >
                                        Go to Dashboard

                                        <ArrowRight
                                            size={18}
                                        />
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            className="
                                                inline-flex
                                                items-center
                                                justify-center
                                                gap-2
                                                rounded-xl
                                                bg-[#0D6EFD]
                                                px-6
                                                py-3.5
                                                text-sm
                                                font-black
                                                text-white
                                                shadow-lg
                                                shadow-blue-500/20
                                                transition
                                                hover:-translate-y-0.5
                                                hover:bg-blue-700
                                            "
                                        >
                                            Login to PROWARE

                                            <ArrowRight
                                                size={
                                                    18
                                                }
                                            />
                                        </Link>

                                        <Link
                                            href="/register"
                                            className="
                                                inline-flex
                                                items-center
                                                justify-center
                                                rounded-xl
                                                border
                                                border-slate-300
                                                bg-white
                                                px-6
                                                py-3.5
                                                text-sm
                                                font-bold
                                                text-slate-700
                                                transition
                                                hover:border-blue-300
                                                hover:bg-blue-50
                                            "
                                        >
                                            Create Student Account
                                        </Link>
                                    </>
                                )}
                            </div>

                            <div
                                className="
                                    mt-10
                                    flex
                                    flex-wrap
                                    gap-x-6
                                    gap-y-3
                                    text-xs
                                    font-medium
                                    text-slate-500
                                    sm:text-sm
                                "
                            >
                                <div className="flex items-center gap-2">
                                    <ShieldCheck
                                        size={17}
                                        className="text-emerald-600"
                                    />

                                    Role-based access
                                </div>

                                <div className="flex items-center gap-2">
                                    <CheckCircle2
                                        size={17}
                                        className="text-emerald-600"
                                    />

                                    Centralized order status
                                </div>

                                <div className="flex items-center gap-2">
                                    <Boxes
                                        size={17}
                                        className="text-emerald-600"
                                    />

                                    Connected inventory
                                </div>
                            </div>
                        </div>

                        {/* QR FLOW PANEL */}
                        <div
                            className="
                                rounded-[2rem]
                                border
                                border-slate-200
                                bg-white
                                p-5
                                shadow-xl
                                shadow-slate-300/30
                                sm:p-7
                            "
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-blue-600">
                                        Core PROWARE Flow
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black text-slate-900">
                                        QR Transaction Lifecycle
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        The same order QR connects
                                        each operational stage.
                                    </p>
                                </div>

                                <div
                                    className="
                                        flex h-12 w-12
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-blue-600
                                        text-white
                                    "
                                >
                                    <QrCode size={24} />
                                </div>
                            </div>

                            <div className="mt-7 space-y-3">
                                <FlowStep
                                    number="01"
                                    title="Student Order"
                                    description="The student selects merchandise and PROWARE generates an order QR."
                                    icon={
                                        ShoppingBag
                                    }
                                />

                                <FlowConnector />

                                <FlowStep
                                    number="02"
                                    title="Cashier Verification"
                                    description="The cashier scans the QR, retrieves the exact order, and confirms payment."
                                    icon={
                                        CreditCard
                                    }
                                />

                                <FlowConnector />

                                <FlowStep
                                    number="03"
                                    title="Specialist Fulfillment"
                                    description="The specialist scans the same QR and immediately retrieves the paid order."
                                    icon={
                                        QrCode
                                    }
                                />

                                <FlowConnector />

                                <FlowStep
                                    number="04"
                                    title="Release & Inventory"
                                    description="Merchandise is released and the centralized inventory record is updated."
                                    icon={
                                        PackageCheck
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    {/* FEATURES */}
                    <section
                        className="
                            border-y
                            border-slate-200
                            bg-white
                        "
                    >
                        <div
                            className="
                                mx-auto
                                max-w-7xl
                                px-5
                                py-16
                                sm:px-6
                                lg:px-8
                                lg:py-20
                            "
                        >
                            <div className="max-w-2xl">
                                <p className="text-sm font-black uppercase tracking-wide text-blue-600">
                                    Centralized Operations
                                </p>

                                <h2
                                    className="
                                        mt-2
                                        text-3xl
                                        font-black
                                        text-slate-900
                                        sm:text-4xl
                                    "
                                >
                                    One system for the complete merchandise process.
                                </h2>

                                <p
                                    className="
                                        mt-4
                                        text-sm
                                        leading-7
                                        text-slate-500
                                        sm:text-base
                                    "
                                >
                                    PROWARE keeps ordering,
                                    payment verification,
                                    fulfillment, and stock
                                    information connected to
                                    the same transaction.
                                </p>
                            </div>

                            <div
                                className="
                                    mt-10
                                    grid
                                    gap-4
                                    sm:grid-cols-2
                                    xl:grid-cols-4
                                "
                            >
                                <FeatureCard
                                    title="Student Ordering"
                                    description="Students browse merchandise, select variants and quantities, and receive a QR for their order."
                                    icon={
                                        ShoppingBag
                                    }
                                />

                                <FeatureCard
                                    title="QR Verification"
                                    description="Cashiers and specialists use the same order QR to retrieve the correct transaction."
                                    icon={
                                        QrCode
                                    }
                                />

                                <FeatureCard
                                    title="Payment Processing"
                                    description="Cashiers confirm payment directly against the student's centralized order record."
                                    icon={
                                        CreditCard
                                    }
                                />

                                <FeatureCard
                                    title="Inventory Control"
                                    description="Reservations, releases, and stock availability remain connected to merchandise transactions."
                                    icon={
                                        Boxes
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    {/* ROLE SECTION */}
                    <section
                        className="
                            mx-auto
                            max-w-7xl
                            px-5
                            py-16
                            sm:px-6
                            lg:px-8
                            lg:py-20
                        "
                    >
                        <div className="text-center">
                            <p className="text-sm font-black uppercase tracking-wide text-blue-600">
                                Role-Based Access
                            </p>

                            <h2
                                className="
                                    mt-2
                                    text-3xl
                                    font-black
                                    text-slate-900
                                    sm:text-4xl
                                "
                            >
                                Every user sees the tools they need.
                            </h2>
                        </div>

                        <div
                            className="
                                mt-10
                                grid
                                gap-4
                                sm:grid-cols-2
                                lg:grid-cols-4
                            "
                        >
                            <RoleCard
                                role="Student"
                                description="Browse merchandise, place orders, monitor status, and present order QR codes."
                            />

                            <RoleCard
                                role="Cashier"
                                description="Scan student QR codes, verify transactions, and confirm payments."
                            />

                            <RoleCard
                                role="PROWARE Specialist"
                                description="Receive stock, manage fulfillment, scan paid orders, and release merchandise."
                            />

                            <RoleCard
                                role="Administrator"
                                description="Manage products, categories, inventory visibility, users, and system oversight."
                            />
                        </div>
                    </section>
                </main>

                {/* FOOTER */}
                <footer className="border-t border-slate-200 bg-white">
                    <div
                        className="
                            mx-auto
                            flex max-w-7xl
                            flex-col
                            gap-3
                            px-5 py-8
                            text-sm
                            text-slate-500
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                            sm:px-6
                            lg:px-8
                        "
                    >
                        <p>
                            © 2026 STI PROWARE
                        </p>

                        <p>
                            Merchandise & Inventory
                            Management System
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}

function getDashboardUrl(
    role?: UserRole,
): string {
    switch (role) {
        case 'admin':
            return '/admin/dashboard';

        case 'student':
            return '/student/dashboard';

        case 'specialist':
            return '/specialist/dashboard';

        case 'cashier':
            return '/cashier/dashboard';

        default:
            return '/login';
    }
}

function FeatureCard({
    title,
    description,
    icon: Icon,
}: FeatureCardProps) {
    return (
        <article
            className="
                rounded-2xl
                border
                border-slate-200
                bg-[#F8FAFC]
                p-6
                shadow-sm
                transition
                hover:-translate-y-1
                hover:border-blue-200
                hover:shadow-md
            "
        >
            <div
                className="
                    flex h-11 w-11
                    items-center
                    justify-center
                    rounded-xl
                    bg-blue-100
                    text-blue-600
                "
            >
                <Icon size={21} />
            </div>

            <h3 className="mt-5 text-lg font-black text-slate-900">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
            </p>
        </article>
    );
}

function FlowStep({
    number,
    title,
    description,
    icon: Icon,
}: FlowStepProps) {
    return (
        <div
            className="
                flex
                items-start
                gap-4
                rounded-2xl
                border
                border-slate-200
                bg-[#F8FAFC]
                p-4
            "
        >
            <div
                className="
                    flex h-11 w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-blue-100
                    text-blue-600
                "
            >
                <Icon size={20} />
            </div>

            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {number}
                    </span>

                    <h3 className="font-black text-slate-900">
                        {title}
                    </h3>
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}

function FlowConnector() {
    return (
        <div className="ml-[1.35rem] h-3 border-l-2 border-dashed border-blue-200" />
    );
}

function RoleCard({
    role,
    description,
}: {
    role: string;
    description: string;
}) {
    return (
        <article
            className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
            "
        >
            <p className="font-black text-slate-900">
                {role}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
            </p>
        </article>
    );
}