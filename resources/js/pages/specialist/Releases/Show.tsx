import {
    ArrowLeft,
    CalendarCheck,
    CheckCircle2,
    History,
    PackageCheck,
    QrCode,
    ShieldCheck,
    ShoppingBag,
    UserRound,
} from 'lucide-react';
import {
    Head,
    Link,
} from '@inertiajs/react';

import SpecialistLayout from '@/layouts/SpecialistLayout';

import specialist from '@/routes/specialist';

interface ReleaseItem {
    id: number;
    product_name: string | null;
    product_code: string | null;
    variant_name: string | null;
    sku: string | null;
    program: string | null;
    size: string | null;
    quantity: number;
    item_type: string | null;
    image_url: string | null;
}

interface StudentInfo {
    name: string;
    student_id: string;
}

interface ReleasedBy {
    name: string;
    email: string | null;
    role: string;
}

interface ReleaseOrder {
    id: number;
    order_number: string;
    order_type: string;
    fulfillment_status: string;
    released_at: string | null;
    release_qr_used_at: string | null;
    student: StudentInfo;
    released_by: ReleasedBy;
    items: ReleaseItem[];
}

interface PageProps {
    order: ReleaseOrder;
}

export default function Show({
    order,
}: PageProps) {
    const isPreorder =
        order.order_type === 'preorder';

    return (
        <SpecialistLayout>
            <Head
                title={`Release ${order.order_number}`}
            />

            <div
                className="
                    mx-auto
                    w-full
                    max-w-5xl
                    space-y-6
                "
            >
                {/* BACK */}
                <Link
                    href={specialist.releases.index.url()}
                    className="
                        inline-flex
                        items-center
                        gap-2
                        text-sm
                        font-bold
                        text-slate-500
                        transition
                        hover:text-blue-600
                    "
                >
                    <ArrowLeft size={17} />
                    Back to Release History
                </Link>

                {/* HEADER */}
                <section
                    className="
                        overflow-hidden
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                    "
                >
                    <div
                        className="
                            flex
                            flex-col
                            gap-5
                            border-b
                            border-slate-100
                            p-6
                            sm:flex-row
                            sm:items-start
                            sm:justify-between
                        "
                    >
                        <div>
                            <div
                                className="
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-2
                                "
                            >
                                <div
                                    className="
                                        flex
                                        h-11
                                        w-11
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-blue-50
                                        text-blue-600
                                    "
                                >
                                    <History
                                        size={21}
                                    />
                                </div>

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
                                        Release Record
                                    </p>

                                    <h1
                                        className="
                                            mt-0.5
                                            font-mono
                                            text-xl
                                            font-black
                                            text-slate-900
                                        "
                                    >
                                        {
                                            order.order_number
                                        }
                                    </h1>
                                </div>
                            </div>

                            <p
                                className="
                                    mt-4
                                    max-w-2xl
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                Historical record of merchandise
                                physically released for this order.
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                flex-wrap
                                gap-2
                            "
                        >
                            {isPreorder && (
                                <span
                                    className="
                                        rounded-full
                                        bg-violet-100
                                        px-3
                                        py-1.5
                                        text-[10px]
                                        font-black
                                        uppercase
                                        tracking-wide
                                        text-violet-700
                                    "
                                >
                                    Preorder
                                </span>
                            )}

                            <span
                                className="
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    rounded-full
                                    bg-emerald-100
                                    px-3
                                    py-1.5
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-emerald-700
                                "
                            >
                                <CheckCircle2
                                    size={13}
                                />
                                Released
                            </span>
                        </div>
                    </div>
                </section>

                {/* STUDENT + RELEASE TRACE */}
                <div
                    className="
                        grid
                        gap-6
                        lg:grid-cols-2
                    "
                >
                    {/* STUDENT */}
                    <section
                        className="
                            rounded-3xl
                            border
                            border-slate-200
                            bg-white
                            p-6
                        "
                    >
                        <SectionTitle
                            icon={UserRound}
                            title="Student"
                        />

                        <div
                            className="
                                mt-5
                                rounded-2xl
                                bg-slate-50
                                p-4
                            "
                        >
                            <p
                                className="
                                    font-black
                                    text-slate-900
                                "
                            >
                                {
                                    order.student
                                        .name
                                }
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    font-semibold
                                    text-slate-500
                                "
                            >
                                Student ID:{' '}
                                {
                                    order.student
                                        .student_id
                                }
                            </p>
                        </div>
                    </section>

                    {/* RELEASE TRACE */}
                    <section
                        className="
                            rounded-3xl
                            border
                            border-slate-200
                            bg-white
                            p-6
                        "
                    >
                        <SectionTitle
                            icon={ShieldCheck}
                            title="Release Verification"
                        />

                        <div className="mt-5 space-y-4">
                            <DetailRow
                                icon={QrCode}
                                label="Release QR Verified"
                                value={
                                    order.release_qr_used_at
                                        ?? 'Not recorded'
                                }
                            />

                            <DetailRow
                                icon={
                                    CalendarCheck
                                }
                                label="Released At"
                                value={
                                    order.released_at
                                        ?? 'Not recorded'
                                }
                            />
                        </div>
                    </section>
                </div>

                {/* MERCHANDISE */}
                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        p-6
                    "
                >
                    <div
                        className="
                            flex
                            items-center
                            justify-between
                            gap-4
                        "
                    >
                        <SectionTitle
                            icon={
                                PackageCheck
                            }
                            title="Released Merchandise"
                        />

                        <p
                            className="
                                text-xs
                                font-bold
                                text-slate-400
                            "
                        >
                            {
                                order.items.reduce(
                                    (
                                        total,
                                        item,
                                    ) =>
                                        total
                                        + item.quantity,
                                    0,
                                )
                            }{' '}
                            units
                        </p>
                    </div>

                    <div
                        className="
                            mt-5
                            space-y-4
                        "
                    >
                        {order.items.map(
                            (item) => (
                                <MerchandiseRow
                                    key={item.id}
                                    item={item}
                                />
                            ),
                        )}
                    </div>
                </section>

                {/* RELEASED BY */}
                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        p-6
                    "
                >
                    <SectionTitle
                        icon={ShieldCheck}
                        title="Released By"
                    />

                    <div
                        className="
                            mt-5
                            grid
                            gap-4
                            rounded-2xl
                            bg-slate-50
                            p-5
                            sm:grid-cols-3
                        "
                    >
                        <TraceInfo
                            label="Specialist"
                            value={
                                order.released_by
                                    .name
                            }
                        />

                        <TraceInfo
                            label="Email"
                            value={
                                order.released_by
                                    .email
                                ?? 'Not recorded'
                            }
                        />

                        <TraceInfo
                            label="Role"
                            value={
                                formatLabel(
                                    order
                                        .released_by
                                        .role,
                                )
                            }
                        />
                    </div>
                </section>

                {/* EVIDENCE NOTE */}
                <section
                    className="
                        rounded-2xl
                        border
                        border-emerald-100
                        bg-emerald-50/60
                        px-5
                        py-4
                    "
                >
                    <div
                        className="
                            flex
                            items-start
                            gap-3
                        "
                    >
                        <ShieldCheck
                            size={19}
                            className="
                                mt-0.5
                                shrink-0
                                text-emerald-600
                            "
                        />

                        <div>
                            <p
                                className="
                                    text-sm
                                    font-black
                                    text-slate-900
                                "
                            >
                                Release Record
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                    leading-5
                                    text-slate-600
                                "
                            >
                                This record identifies the
                                merchandise released, the student,
                                release verification time when
                                available, physical release time,
                                and the Specialist who performed
                                the release.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </SpecialistLayout>
    );
}

function MerchandiseRow({
    item,
}: {
    item: ReleaseItem;
}) {
    const details =
        [
            item.program,
            item.size,
        ].filter(
            (
                value,
            ): value is string =>
                Boolean(
                    value?.trim(),
                ),
        );

    const variantLabel =
        details.length > 0
            ? Array.from(
                  new Set(
                      details,
                  ),
              ).join(' • ')
            : item.variant_name
              ? item.variant_name
              : 'Standard';

    return (
        <div
            className="
                flex
                flex-col
                gap-4
                rounded-2xl
                border
                border-slate-100
                bg-slate-50/60
                p-4
                sm:flex-row
                sm:items-center
            "
        >
            <div
                className="
                    flex
                    h-24
                    w-24
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-xl
                    border
                    border-slate-100
                    bg-white
                "
            >
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={
                            item.product_name
                                ?? 'Merchandise'
                        }
                        className="
                            h-full
                            w-full
                            object-contain
                            p-1
                        "
                    />
                ) : (
                    <ShoppingBag
                        size={28}
                        className="text-slate-300"
                    />
                )}
            </div>

            <div
                className="
                    min-w-0
                    flex-1
                "
            >
                <p
                    className="
                        font-black
                        text-slate-900
                    "
                >
                    {item.product_name
                        ?? 'Unknown Merchandise'}
                </p>

                <p
                    className="
                        mt-1
                        text-sm
                        font-semibold
                        text-slate-600
                    "
                >
                    {variantLabel}
                </p>

                {item.sku && (
                    <p
                        className="
                            mt-1
                            font-mono
                            text-xs
                            text-slate-400
                        "
                    >
                        SKU: {item.sku}
                    </p>
                )}
            </div>

            <div
                className="
                    shrink-0
                    rounded-xl
                    bg-blue-50
                    px-4
                    py-3
                    text-center
                "
            >
                <p
                    className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-wide
                        text-blue-500
                    "
                >
                    Quantity Released
                </p>

                <p
                    className="
                        mt-1
                        text-xl
                        font-black
                        text-blue-700
                    "
                >
                    {item.quantity}
                </p>
            </div>
        </div>
    );
}

function DetailRow({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof QrCode;
    label: string;
    value: string;
}) {
    return (
        <div
            className="
                flex
                items-start
                gap-3
                rounded-xl
                bg-slate-50
                p-4
            "
        >
            <Icon
                size={17}
                className="
                    mt-0.5
                    shrink-0
                    text-blue-600
                "
            />

            <div>
                <p
                    className="
                        text-[10px]
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
                        mt-1
                        text-sm
                        font-bold
                        text-slate-800
                    "
                >
                    {value}
                </p>
            </div>
        </div>
    );
}

function TraceInfo({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p
                className="
                    text-[10px]
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
                    mt-1
                    break-words
                    text-sm
                    font-bold
                    text-slate-800
                "
            >
                {value}
            </p>
        </div>
    );
}

function SectionTitle({
    icon: Icon,
    title,
}: {
    icon: typeof PackageCheck;
    title: string;
}) {
    return (
        <div
            className="
                flex
                items-center
                gap-2
            "
        >
            <Icon
                size={18}
                className="text-blue-600"
            />

            <h2
                className="
                    font-black
                    text-slate-900
                "
            >
                {title}
            </h2>
        </div>
    );
}

function formatLabel(
    value: string,
) {
    return value
        .replaceAll('_', ' ')
        .replace(
            /\b\w/g,
            (
                letter,
            ) =>
                letter.toUpperCase(),
        );
}