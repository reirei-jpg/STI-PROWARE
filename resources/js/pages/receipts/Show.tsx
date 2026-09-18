import {
    ArrowLeft,
    CheckCircle2,
    Printer,
    QrCode,
} from 'lucide-react';

import {
    Head,
    Link,
} from '@inertiajs/react';

import {
    QRCodeSVG,
} from 'qrcode.react';

interface ReceiptItem {
    id: number;

    product_code: string;

    product_name: string;

    variant_name: string;

    sku: string;

    program: string | null;

    size: string | null;

    item_type:
        | 'order'
        | 'preorder';

    quantity: number;

    unit_price: string;

    line_total: string;
}

interface ReceiptOrder {
    id: number;

    transaction_number:
        | string
        | null;

    payment_method:
    | string
    | null;

payment_reference:
    | string
    | null;  
    order_number: string;

    order_type: string;

    payment_status: string;

    fulfillment_status: string;

    subtotal: string;

    total: string;

    tax_rate: string;

    tax_amount: string;

    vatable_sales: string;

    total_quantity: number;

    created_at:
        | string
        | null;

    paid_at:
        | string
        | null;

        cashier: {
            name: string;
        };


    release_qr_token:
        | string
        | null;

    release_qr_used: boolean;

    student: {
        name: string;

        student_id: string;

        course: string;

        year_level: string;
    };

    items: ReceiptItem[];
}

interface ReceiptProps {
    viewer:
        | 'student'
        | 'cashier';

    backUrl: string;

    order: ReceiptOrder;
}

export default function Show({
    viewer,
    backUrl,
    order,
}: ReceiptProps) {

    /*
     * Merchandise has already been
     * released when either:
     *
     * 1. fulfillment status is released
     * 2. Release QR has been consumed
     */
    const merchandiseReleased =
        order.fulfillment_status
            === 'released'
        || order.release_qr_used;

    return (
        <>
            <Head
                title={`Receipt ${
                    order.transaction_number
                    ?? order.order_number
                }`}
            />

            {/*
             * Print CSS
             *
             * When printing, only the narrow
             * receipt itself is printed.
             */}
            <style>{`
                @media print {
                    body {
                        background: #ffffff !important;
                    }

                    body * {
                        visibility: hidden;
                    }

                    #proware-thermal-receipt,
                    #proware-thermal-receipt * {
                        visibility: visible;
                    }

                    #proware-thermal-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    @page {
                        size: 80mm auto;
                        margin: 5mm;
                    }
                }
            `}</style>

            <div
                className="
                    min-h-screen
                    bg-slate-200
                    px-4 py-8
                "
            >
                <div className="mx-auto max-w-3xl">

                    {/* SCREEN ACTIONS */}
                    <div
                        className="
                            no-print
                            mx-auto mb-5
                            flex max-w-[420px]
                            flex-wrap
                            items-center
                            justify-between
                            gap-3
                        "
                    >
                        <Link
                            href={
                                backUrl
                            }
                            className="
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                border
                                border-slate-300
                                bg-white
                                px-4 py-3
                                text-sm
                                font-bold
                                text-slate-700
                                shadow-sm
                                transition
                                hover:bg-slate-50
                            "
                        >
                            <ArrowLeft
                                size={17}
                            />

                            Back
                        </Link>

                        <button
                            type="button"
                            onClick={() =>
                                window.print()
                            }
                            className="
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                bg-blue-600
                                px-5 py-3
                                text-sm
                                font-black
                                text-white
                                shadow-sm
                                transition
                                hover:bg-blue-700
                            "
                        >
                            <Printer
                                size={17}
                            />

                            Print Receipt
                        </button>
                    </div>

                    {/* RECEIPT PAPER */}
                    <main
                        id="proware-thermal-receipt"
                        className="
                            mx-auto
                            w-full
                            max-w-[380px]
                            bg-white
                            px-6
                            py-8
                            font-mono
                            text-[12px]
                            leading-5
                            text-black
                            shadow-2xl
                        "
                    >
                        {/* STORE HEADER */}
                        <header className="text-center">
                            <h1
                                className="
                                    text-xl
                                    font-black
                                    tracking-tight
                                "
                            >
                                STI PROWARE
                            </h1>

                            <p
                                className="
                                    mt-1
                                    text-[10px]
                                    font-bold
                                    uppercase
                                    tracking-[0.15em]
                                "
                            >
                                STI College
                                Merchandise
                            </p>

                            <p
                                className="
                                    mt-3
                                    text-[11px]
                                    font-black
                                    uppercase
                                "
                            >
                                Official Payment
                                Receipt
                            </p>
                        </header>

                        <ReceiptDivider />

                        {/* RELEASE QR */}
                        {!merchandiseReleased
                            && order.release_qr_token ? (
                                <section className="text-center">
                                    <p
                                        className="
                                            text-[10px]
                                            font-black
                                            uppercase
                                            tracking-wider
                                        "
                                    >
                                        Release QR
                                    </p>

                                    <div
                                        className="
                                            mt-2
                                            inline-block
                                            bg-white
                                        "
                                    >
                                        <QRCodeSVG
                                            value={
                                                order.release_qr_token
                                            }
                                            size={
                                                150
                                            }
                                            level="H"
                                            includeMargin
                                        />
                                    </div>

                                    <p
                                        className="
                                            mt-1
                                            text-[10px]
                                            font-bold
                                        "
                                    >
                                        PRESENT WHEN
                                        CLAIMING
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-[9px]
                                        "
                                    >
                                        Show this QR
                                        to the PROWARE
                                        Specialist.
                                    </p>
                                </section>
                            ) : (
                                <section className="py-3 text-center">
                                    <CheckCircle2
                                        size={
                                            32
                                        }
                                        className="mx-auto"
                                    />

                                    <p
                                        className="
                                            mt-2
                                            font-black
                                            uppercase
                                        "
                                    >
                                        Merchandise
                                        Released
                                    </p>

                                    <p className="mt-1 text-[10px]">
                                        Release QR
                                        already used.
                                    </p>
                                </section>
                            )}

                        <ReceiptDivider />

                        {/* TRANSACTION DETAILS */}
                        <section>
                            <ReceiptRow
                                label="TXN"
                                value={
                                    order.transaction_number
                                    ?? 'N/A'
                                }
                            />

                            <ReceiptRow
                                label="ORDER"
                                value={
                                    order.order_number
                                }
                            />

                            <ReceiptRow
                                label="PAID"
                                value={
                                    order.paid_at
                                    ?? 'N/A'
                                }
                            />

                            <ReceiptRow
                                label="CASHIER"
                                value={
                                    order.cashier.name
                                }
                            />
                        </section>

                        <ReceiptDivider />

                        {/* STUDENT */}
                        <section>
                            <p
                                className="
                                    mb-2
                                    font-black
                                    uppercase
                                "
                            >
                                Student
                            </p>

                            <p className="font-black">
                                {
                                    order.student
                                        .name
                                }
                            </p>

                            <p>
                                {
                                    order.student
                                        .student_id
                                }
                            </p>

                            <p>
                                {
                                    order.student
                                        .course
                                }

                                {' • '}

                                {
                                    order.student
                                        .year_level
                                }
                            </p>
                        </section>

                        <ReceiptDivider />

                        {/* ITEM HEADER */}
                        <section>
                            <div
                                className="
                                    grid
                                    grid-cols-[1fr_auto]
                                    gap-3
                                    font-black
                                    uppercase
                                "
                            >
                                <span>
                                    Item
                                </span>

                                <span>
                                    Amount
                                </span>
                            </div>

                            <div className="mt-4 space-y-5">
                                {order.items.map(
                                    (
                                        item,
                                    ) => (
                                        <ReceiptItemRow
                                            key={
                                                item.id
                                            }
                                            item={
                                                item
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        </section>

                        <ReceiptDivider />

                        {/* TOTALS */}
                        <section className="space-y-1">
                            <ReceiptRow
                                label="TOTAL ITEMS"
                                value={String(
                                    order.total_quantity,
                                )}
                            />

                            <ReceiptRow
                                label="VATABLE SALES"
                                value={formatCurrency(
                                    order.vatable_sales,
                                )}
                            />

                            <ReceiptRow
                                label={`VAT (${Number(
                                    order.tax_rate,
                                )}%)`}
                                value={formatCurrency(
                                    order.tax_amount,
                                )}
                            />
                        </section>

                        <p
                            className="
                                mt-2
                                text-[9px]
                                leading-4
                            "
                        >
                            Prices already include VAT.
                            This is a breakdown of your
                            total, not an added charge.
                        </p>

                        <div
                            className="
                                my-4
                                border-y-2
                                border-black
                                py-3
                            "
                        >
                            <div
                                className="
                                    flex
                                    items-end
                                    justify-between
                                    gap-4
                                "
                            >
                                <span
                                    className="
                                        text-base
                                        font-black
                                    "
                                >
                                    TOTAL
                                </span>

                                <span
                                    className="
                                        text-xl
                                        font-black
                                    "
                                >
                                    {formatCurrency(
                                        order.total,
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* PAYMENT */}
                        <section className="space-y-1">
                            <ReceiptRow
                                label="PAYMENT"
                                value="PAID"
                            />

                            {/*
                             * Payment method will
                             * become dynamic when
                             * Cash / GCash / Maya
                             * is implemented.
                             */}
                            <ReceiptRow
                                label="METHOD"
                                value={formatReceiptPaymentMethod(
                                    order.payment_method,
                                )}
                            />

                            <ReceiptRow
                                label="REFERENCE"
                                value={
                                    order.payment_reference
                                    ?? 'N/A'
                                }
                            />
                        </section>

                        <ReceiptDivider />

                        {/* PAYMENT CONFIRMED */}
                        <section className="text-center">
                            <div
                                className="
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                    font-black
                                "
                            >
                                <CheckCircle2
                                    size={
                                        16
                                    }
                                />

                                PAYMENT
                                CONFIRMED
                            </div>

                            <p
                                className="
                                    mx-auto
                                    mt-3
                                    max-w-[270px]
                                    text-[10px]
                                    leading-4
                                "
                            >
                                This receipt is
                                your proof of
                                payment.
                            </p>

                            {!merchandiseReleased && (
                                <p
                                    className="
                                        mx-auto
                                        mt-1
                                        max-w-[270px]
                                        text-[10px]
                                        leading-4
                                    "
                                >
                                    Present the
                                    Release QR
                                    above to the
                                    PROWARE
                                    Specialist
                                    when claiming
                                    your
                                    merchandise.
                                </p>
                            )}

                            <p
                                className="
                                    mt-6
                                    text-xs
                                    font-black
                                    uppercase
                                "
                            >
                                Thank You!
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-[9px]
                                "
                            >
                                STI PROWARE
                            </p>
                        </section>

                        <ReceiptDivider />

                        <p
                            className="
                                text-center
                                text-[8px]
                                leading-3
                            "
                        >
                            Transaction:{' '}
                            {
                                order.transaction_number
                                ?? 'N/A'
                            }
                        </p>
                    </main>

                    {/* SEPARATE STUDENT RELEASE QR */}
                    {viewer === 'student'
                        && order.release_qr_token
                        && !merchandiseReleased && (
                            <section
                                className="
                                    no-print
                                    mx-auto mt-7
                                    max-w-[420px]
                                    rounded-3xl
                                    border
                                    border-blue-200
                                    bg-white
                                    p-6
                                    text-center
                                    shadow-sm
                                "
                            >
                                <div
                                    className="
                                        mx-auto
                                        flex h-12
                                        w-12
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-blue-50
                                        text-blue-600
                                    "
                                >
                                    <QrCode
                                        size={
                                            24
                                        }
                                    />
                                </div>

                                <h2
                                    className="
                                        mt-4
                                        text-xl
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    My Release QR
                                </h2>

                                <p
                                    className="
                                        mx-auto
                                        mt-2
                                        max-w-sm
                                        text-sm
                                        leading-6
                                        text-slate-500
                                    "
                                >
                                    You do not
                                    need to print
                                    the receipt.
                                    Show this QR
                                    directly to the
                                    PROWARE
                                    Specialist.
                                </p>

                                <div
                                    className="
                                        mt-5
                                        inline-block
                                        rounded-2xl
                                        border
                                        border-slate-200
                                        bg-white
                                        p-4
                                    "
                                >
                                    <QRCodeSVG
                                        value={
                                            order.release_qr_token
                                        }
                                        size={
                                            240
                                        }
                                        level="H"
                                        includeMargin
                                    />
                                </div>

                                <p
                                    className="
                                        mt-4
                                        font-mono
                                        text-xs
                                        font-black
                                        text-slate-500
                                    "
                                >
                                    {
                                        order.transaction_number
                                    }
                                </p>
                            </section>
                        )}
                </div>
            </div>
        </>
    );
}

/*
|--------------------------------------------------------------------------
| Receipt Item
|--------------------------------------------------------------------------
*/

function ReceiptItemRow({
    item,
}: {
    item: ReceiptItem;
}) {
    const variantParts = [
        item.program,
        item.size,
    ].filter(
        Boolean,
    );

    const variantText =
        variantParts.length > 0
            ? variantParts.join(
                  ' / ',
              )
            : item.variant_name;

    return (
        <div>
            <div
                className="
                    grid
                    grid-cols-[1fr_auto]
                    gap-3
                "
            >
                <div className="min-w-0">
                    <p className="font-black">
                        {
                            item.product_name
                        }
                    </p>

                    <p className="text-[10px]">
                        {
                            variantText
                        }
                    </p>

                    <p
                        className="
                            mt-1
                            text-[9px]
                        "
                    >
                        {
                            item.product_code
                        }

                        {' • '}

                        {item.sku}
                    </p>

                    {item.item_type ===
                        'preorder' && (
                        <p
                            className="
                                mt-1
                                text-[9px]
                                font-black
                            "
                        >
                            PREORDER
                        </p>
                    )}

                    <p
                        className="
                            mt-1
                            text-[10px]
                        "
                    >
                        {
                            item.quantity
                        }{' '}
                        x{' '}
                        {formatCurrency(
                            item.unit_price,
                        )}
                    </p>
                </div>

                <p className="font-black">
                    {formatCurrency(
                        item.line_total,
                    )}
                </p>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Standard Receipt Row
|--------------------------------------------------------------------------
*/

function ReceiptRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div
            className="
                flex
                items-start
                justify-between
                gap-5
            "
        >
            <span>
                {label}
            </span>

            <span
                className="
                    max-w-[65%]
                    text-right
                    font-black
                "
            >
                {value}
            </span>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Dashed Receipt Separator
|--------------------------------------------------------------------------
*/

function ReceiptDivider() {
    return (
        <div
            className="
                my-5
                border-t
                border-dashed
                border-black/60
            "
        />
    );
}

/*
|--------------------------------------------------------------------------
| Currency
|--------------------------------------------------------------------------
*/

function formatCurrency(
    amount: string,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style:
                'currency',

            currency:
                'PHP',

            minimumFractionDigits:
                2,
        },
    ).format(
        Number(
            amount,
        ),
    );
}

function formatReceiptPaymentMethod(
    method:
        | string
        | null,
): string {
    switch (method) {
        case 'gcash':
            return 'GCash';

        case 'maya':
            return 'Maya';

        case 'cash':
            return 'Cash';

        default:
            return 'N/A';
    }
}