import {
    ArrowLeft,
    ArrowRight,
    Boxes,
    CalendarDays,
    Hash,
    PackageCheck,
    ReceiptText,
} from 'lucide-react';

import {
    Head,
    Link,
    usePage,
} from '@inertiajs/react';

import type {
    ReactNode,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';

interface SharedPageProps {
    [key: string]: unknown;

    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
        } | null;
    };
}

interface ReceiptData {
    id: number;

    receipt_number:
        string | null;

    supplier_reference_number:
        string | null;

    movement_type:
        string;

    quantity_received:
        number;

    quantity_before:
        number;

    quantity_after:
        number;

    notes:
        string | null;

    created_at:
        string | null;

    product: {
        id:
            number | null;

        code:
            string;

        name:
            string;
    };

    variant: {
        id:
            number | null;

        sku:
            string;

        program:
            string | null;

        size:
            string | null;

        variant_name:
            string;
    };

    performed_by: {
        id:
            number | null;

        name:
            string;

        email:
            string | null;
    };
}

interface PageProps {
    receipt:
        ReceiptData;
}

export default function Show({
    receipt,
}: PageProps) {
    const page =
        usePage<SharedPageProps>();

    const role =
        page.props.auth.user?.role;

    const Layout =
        role === 'specialist'
            ? SpecialistLayout
            : AdminLayout;

    return (
        <Layout>
            <Head
                title={
                    `Receipt ${
                        receipt.receipt_number
                        ?? receipt.id
                    }`
                }
            />

            <div
                className="
                    mx-auto
                    max-w-6xl
                    space-y-6
                "
            >
                <Link
                    href="/staff/stock-receipts"
                    className="
                        inline-flex
                        items-center
                        gap-2
                        text-sm
                        font-black
                        text-blue-600
                        transition
                        hover:text-blue-800
                    "
                >
                    <ArrowLeft
                        size={17}
                    />

                    Back to Receipt History
                </Link>

                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-100
                        bg-white
                        p-6
                        shadow-sm
                    "
                >
                    <div
                        className="
                            flex
                            flex-col
                            gap-5
                            lg:flex-row
                            lg:items-start
                            lg:justify-between
                        "
                    >
                        <div
                            className="
                                flex
                                items-start
                                gap-4
                            "
                        >
                            <div
                                className="
                                    flex
                                    h-14
                                    w-14
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-blue-100
                                    text-blue-600
                                "
                            >
                                <ReceiptText
                                    size={25}
                                />
                            </div>

                            <div>
                                <p
                                    className="
                                        text-xs
                                        font-black
                                        uppercase
                                        tracking-wide
                                        text-blue-600
                                    "
                                >
                                    Stock Receipt
                                </p>

                                <h1
                                    className="
                                        mt-1
                                        font-mono
                                        text-2xl
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    {
                                        receipt.receipt_number
                                        ?? `Movement #${receipt.id}`
                                    }
                                </h1>

                                <p
                                    className="
                                        mt-2
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Complete stock receiving record.
                                </p>
                            </div>
                        </div>

                        <div
                            className="
                                rounded-2xl
                                bg-slate-50
                                px-5
                                py-4
                            "
                        >
                            <p
                                className="
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-slate-400
                                "
                            >
                                Received
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    font-black
                                    text-slate-800
                                "
                            >
                                {
                                    receipt.created_at
                                    ?? 'Unknown date'
                                }
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    className="
                        grid
                        gap-5
                        md:grid-cols-2
                        xl:grid-cols-4
                    "
                >
                    <MetricCard
                        label="Before"
                        value={
                            receipt.quantity_before
                        }
                        icon={
                            Boxes
                        }
                    />

                    <MetricCard
                        label="Received"
                        value={
                            receipt.quantity_received
                        }
                        icon={
                            PackageCheck
                        }
                    />

                    <MetricCard
                        label="After"
                        value={
                            receipt.quantity_after
                        }
                        icon={
                            ArrowRight
                        }
                    />

                    <MetricCard
                        label="Movement ID"
                        value={
                            receipt.id
                        }
                        icon={
                            Hash
                        }
                    />
                </section>

                <div
                    className="
                        grid
                        gap-6
                        lg:grid-cols-2
                    "
                >
                    <InfoCard
                        title="Merchandise"
                    >
                        <InfoRow
                            label="Product Code"
                            value={
                                receipt.product.code
                            }
                        />

                        <InfoRow
                            label="Product Name"
                            value={
                                receipt.product.name
                            }
                        />

                        <InfoRow
                            label="Variant"
                            value={
                                receipt.variant.variant_name
                            }
                        />

                        <InfoRow
                            label="SKU"
                            value={
                                receipt.variant.sku
                            }
                        />

                        {receipt.variant.program && (
                            <InfoRow
                                label="Program"
                                value={
                                    receipt.variant.program
                                }
                            />
                        )}

                        {receipt.variant.size && (
                            <InfoRow
                                label="Size"
                                value={
                                    receipt.variant.size
                                }
                            />
                        )}
                    </InfoCard>

                    <InfoCard
                        title="Receiving Information"
                    >
                        <InfoRow
                            label="Supplier Reference"
                            value={
                                receipt
                                    .supplier_reference_number
                                ?? 'Not provided'
                            }
                        />

                        <InfoRow
                            label="Received By"
                            value={
                                receipt.performed_by.name
                            }
                        />

                        <InfoRow
                            label="Staff Email"
                            value={
                                receipt.performed_by.email
                                ?? 'Not available'
                            }
                        />

                        <InfoRow
                            label="Date / Time"
                            value={
                                receipt.created_at
                                ?? 'Unknown'
                            }
                        />
                    </InfoCard>
                </div>

                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-100
                        bg-white
                        p-6
                        shadow-sm
                    "
                >
                    <div
                        className="
                            flex
                            items-center
                            gap-3
                        "
                    >
                        <CalendarDays
                            size={20}
                            className="
                                text-blue-600
                            "
                        />

                        <h2
                            className="
                                font-black
                                text-slate-900
                            "
                        >
                            Notes
                        </h2>
                    </div>

                    <p
                        className="
                            mt-4
                            whitespace-pre-wrap
                            text-sm
                            leading-7
                            text-slate-600
                        "
                    >
                        {
                            receipt.notes
                            ?? 'No notes were recorded for this stock receipt.'
                        }
                    </p>
                </section>
            </div>
        </Layout>
    );
}

function MetricCard({
    label,
    value,
    icon: Icon,
}: {
    label:
        string;

    value:
        number;

    icon:
        typeof Boxes;
}) {
    return (
        <article
            className="
                rounded-3xl
                border
                border-slate-100
                bg-white
                p-5
                shadow-sm
            "
        >
            <div
                className="
                    flex
                    items-start
                    justify-between
                    gap-4
                "
            >
                <div>
                    <p
                        className="
                            text-xs
                            font-black
                            uppercase
                            tracking-wide
                            text-slate-400
                        "
                    >
                        {label}
                    </p>

                    <p
                        className="
                            mt-3
                            text-3xl
                            font-black
                            text-slate-900
                        "
                    >
                        {value}
                    </p>
                </div>

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
                    "
                >
                    <Icon
                        size={20}
                    />
                </div>
            </div>
        </article>
    );
}

function InfoCard({
    title,
    children,
}: {
    title:
        string;

    children:
        ReactNode;
}) {
    return (
        <section
            className="
                rounded-3xl
                border
                border-slate-100
                bg-white
                p-6
                shadow-sm
            "
        >
            <h2
                className="
                    font-black
                    text-slate-900
                "
            >
                {title}
            </h2>

            <div
                className="
                    mt-5
                    divide-y
                    divide-slate-100
                "
            >
                {children}
            </div>
        </section>
    );
}

function InfoRow({
    label,
    value,
}: {
    label:
        string;

    value:
        string;
}) {
    return (
        <div
            className="
                flex
                items-start
                justify-between
                gap-5
                py-3
            "
        >
            <span
                className="
                    text-sm
                    text-slate-500
                "
            >
                {label}
            </span>

            <span
                className="
                    max-w-[65%]
                    text-right
                    text-sm
                    font-black
                    text-slate-800
                "
            >
                {value}
            </span>
        </div>
    );
}