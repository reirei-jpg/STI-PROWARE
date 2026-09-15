    import {
        ArrowRight,
        Boxes,
        PackageCheck,
        QrCode,
        Truck,
    } from 'lucide-react';

    import {
        Head,
        Link,
    } from '@inertiajs/react';

    import SpecialistLayout from '@/layouts/SpecialistLayout';

    import specialist from '@/routes/specialist';

    export default function Dashboard() {
        return (
            <SpecialistLayout>
                <Head title="Specialist Dashboard" />

                <div className="mx-auto max-w-7xl space-y-6">
                    {/* PRIMARY SPECIALIST ACTION */}
                    <section
                        className="
                            relative
                            overflow-hidden
                            rounded-3xl
                            bg-gradient-to-r
                            from-[#0D6EFD]
                            via-blue-600
                            to-blue-700
                            p-6
                            text-white
                            shadow-sm
                            sm:p-8
                        "
                    >
                        <div
                            className="
                                relative
                                z-10
                                grid
                                gap-7
                                lg:grid-cols-[1fr_auto]
                                lg:items-center
                            "
                        >
                            <div className="max-w-2xl">
                                <div
                                    className="
                                        flex
                                        h-14
                                        w-14
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-white/15
                                    "
                                >
                                    <QrCode size={28} />
                                </div>

                                <p
                                    className="
                                        mt-5
                                        text-xs
                                        font-black
                                        uppercase
                                        tracking-wide
                                        text-blue-100
                                    "
                                >
                                    Primary Specialist Action
                                </p>

                                <h1
                                    className="
                                        mt-2
                                        text-3xl
                                        font-black
                                        sm:text-4xl
                                    "
                                >
                                    Scan Student Order QR
                                </h1>

                                <p
                                    className="
                                        mt-3
                                        max-w-xl
                                        text-sm
                                        leading-6
                                        text-blue-100
                                    "
                                >
                                    Scan the same QR used
                                    during payment to open
                                    the student&apos;s exact
                                    paid order, verify the
                                    merchandise, and release
                                    it.
                                </p>
                            </div>

                            <div
                                className="
                                    flex
                                    flex-col
                                    gap-3
                                    sm:flex-row
                                    lg:flex-col
                                "
                            >
                                <Link
                                    href="/orders/scanner"
                                    className="
                                        inline-flex
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        bg-yellow-400
                                        px-5
                                        py-3
                                        text-sm
                                        font-black
                                        text-blue-900
                                        transition
                                        hover:bg-yellow-300
                                    "
                                >
                                    <QrCode size={18} />

                                    Scan Order QR
                                </Link>

                                <Link
                                    href={specialist.orders.index.url()}
                                    className="
                                        inline-flex
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        border
                                        border-white/25
                                        bg-white/10
                                        px-5
                                        py-3
                                        text-sm
                                        font-bold
                                        text-white
                                        transition
                                        hover:bg-white/20
                                    "
                                >
                                    <PackageCheck
                                        size={18}
                                    />

                                    Fulfillment Queue
                                </Link>
                            </div>
                        </div>

                        <QrCode
                            size={200}
                            strokeWidth={1}
                            className="
                                absolute
                                -bottom-8
                                right-10
                                hidden
                                text-white/10
                                xl:block
                            "
                        />
                    </section>

                    {/* ROLE EXPLANATION */}
                    <section
                        className="
                            rounded-3xl
                            border
                            border-blue-100
                            bg-blue-50/70
                            p-6
                        "
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className="
                                    flex
                                    h-12
                                    w-12
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-blue-600
                                    text-white
                                "
                            >
                                <PackageCheck
                                    size={22}
                                />
                            </div>

                            <div>
                                <h2 className="font-black text-blue-950">
                                    Your Role in the PROWARE Flow
                                </h2>

                                <p
                                    className="
                                        mt-2
                                        max-w-3xl
                                        text-sm
                                        leading-6
                                        text-blue-800
                                    "
                                >
                                    The cashier confirms
                                    payment first. When the
                                    student reaches you,
                                    scanning the same QR
                                    opens the exact paid
                                    order so you can verify
                                    the items and complete
                                    merchandise release.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* SUPPORTING OPERATIONS */}
                    <section>
                        <div>
                            <h2 className="text-xl font-black text-slate-900">
                                Supporting Operations
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Use these when fulfillment
                                work requires inventory or
                                stock receiving.
                            </p>
                        </div>

                        <div
                            className="
                                mt-4
                                grid
                                gap-4
                                md:grid-cols-3
                            "
                        >
                            <SpecialistActionCard
                                title="Order Fulfillment"
                                description="Review paid orders waiting for merchandise release."
                                href={specialist.orders.index.url()}
                                icon={
                                    PackageCheck
                                }
                            />

                            <SpecialistActionCard
                                title="Inventory"
                                description="Check on-hand, reserved, available, and reorder quantities."
                                href="/staff/inventory"
                                icon={Boxes}
                            />

                            <SpecialistActionCard
                                title="Receive Stock"
                                description="Record new deliveries and update inventory quantities."
                                href="/staff/stock-receipts/create"
                                icon={Truck}
                            />
                        </div>
                    </section>
                </div>
            </SpecialistLayout>
        );
    }

    function SpecialistActionCard({
        title,
        description,
        href,
        icon: Icon,
    }: {
        title: string;
        description: string;
        href: string;
        icon: typeof Boxes;
    }) {
        return (
            <Link
                href={href}
                className="
                    group
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-5
                    shadow-sm
                    transition
                    hover:-translate-y-0.5
                    hover:border-blue-200
                    hover:shadow-md
                "
            >
                <div
                    className="
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-100
                        text-blue-600
                        transition
                        group-hover:bg-blue-600
                        group-hover:text-white
                    "
                >
                    <Icon size={20} />
                </div>

                <h3 className="mt-4 font-black text-slate-900">
                    {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                    {description}
                </p>

                <p
                    className="
                        mt-4
                        inline-flex
                        items-center
                        gap-1
                        text-sm
                        font-bold
                        text-blue-600
                    "
                >
                    Open

                    <ArrowRight
                        size={15}
                    />
                </p>
            </Link>
        );
    }