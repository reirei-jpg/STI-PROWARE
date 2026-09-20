<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentOrderController extends Controller
{
    private const DISPLAY_TIMEZONE =
        'Asia/Manila';

    /**
     * Show all orders that belong to
     * the logged-in student.
     */
    public function index(
        Request $request,
    ): Response {
        /*
        |--------------------------------------------------------------------------
        | Logged-in Student
        |--------------------------------------------------------------------------
        */

        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        $student =
            $user->student;

        abort_unless(
            $student,
            403,
            'This account does not have a student profile.',
        );

        /*
        |--------------------------------------------------------------------------
        | Base Query
        |--------------------------------------------------------------------------
        */

        $studentOrders =
            Order::query()
                ->where(
                    'student_id',
                    $student->id,
                );

        /*
        |--------------------------------------------------------------------------
        | Current Order Summary
        |--------------------------------------------------------------------------
        */

        $pendingPayment =
            (clone $studentOrders)
                ->where(
                    'payment_status',
                    Order::PAYMENT_PENDING,
                )
                ->where(
                    'fulfillment_status',
                    '!=',
                    Order::FULFILLMENT_CANCELLED,
                )
                ->excludingExpiredPreorders()
                ->count();

        $paid =
            (clone $studentOrders)
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereIn(
                    'fulfillment_status',
                    [
                        Order::FULFILLMENT_PENDING,
                        Order::FULFILLMENT_PREPARING,
                    ],
                )
                ->count();

        $readyForRelease =
            (clone $studentOrders)
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->where(
                    'fulfillment_status',
                    Order::FULFILLMENT_READY,
                )
                ->count();

        $released =
            (clone $studentOrders)
                ->where(
                    'fulfillment_status',
                    Order::FULFILLMENT_RELEASED,
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Philippine "Today"
        |--------------------------------------------------------------------------
        |
        | Laravel/database stay UTC.
        |
        | We calculate the beginning and end of
        | the Philippine calendar day and then
        | convert those boundaries back to UTC
        | for the database query.
        |
        */

        $todayStartUtc =
            now(
                self::DISPLAY_TIMEZONE,
            )
                ->startOfDay()
                ->utc();

        $todayEndUtc =
            now(
                self::DISPLAY_TIMEZONE,
            )
                ->endOfDay()
                ->utc();

        /*
        |--------------------------------------------------------------------------
        | History Summary
        |--------------------------------------------------------------------------
        */

        $paidToday =
            (clone $studentOrders)
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'paid_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
                    ],
                )
                ->count();

        $releasedToday =
            (clone $studentOrders)
                ->where(
                    'fulfillment_status',
                    Order::FULFILLMENT_RELEASED,
                )
                ->whereBetween(
                    'released_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
                    ],
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Orders
        |--------------------------------------------------------------------------
        */

        $orders =
            Order::query()
                ->where(
                    'student_id',
                    $student->id,
                )
                ->with([
                    'items.productVariant.product',
                ])
                ->withCount(
                    'items',
                )
                ->latest()
                ->get()
                ->map(
                    function (
                        Order $order,
                    ): array {
                        /*
                        |--------------------------------------------------------------------------
                        | Merchandise Preview
                        |--------------------------------------------------------------------------
                        */

                        $previewItem =
                            $order
                                ->items
                                ->first();

                        $previewProduct =
                            $previewItem
                                ?->productVariant
                                ?->product;

                        $previewImageUrl =
                            $previewProduct
                                ?->image_path
                            ? '/storage/'
                                .ltrim(
                                    $previewProduct
                                        ->image_path,
                                    '/',
                                )
                            : null;

                        $additionalItemsCount =
                            max(
                                $order
                                    ->items
                                    ->count()
                                - 1,
                                0,
                            );

                        return [
                            /*
                            |--------------------------------------------------------------------------
                            | Order
                            |--------------------------------------------------------------------------
                            */

                            'id' => $order->id,

                            'order_number' => $order
                                ->order_number,

                            'order_type' => $order
                                ->order_type,

                            /*
                            | Every item is a preorder that expired: nothing
                            | left to pay for or collect.
                            */

                            'is_expired_preorder' => $order
                                ->hasOnlyExpiredPreorders(),

                            /*
                            |--------------------------------------------------------------------------
                            | Status
                            |--------------------------------------------------------------------------
                            */

                            'payment_status' => $order
                                ->payment_status,

                            'fulfillment_status' => $order
                                ->fulfillment_status,

                            /*
                            |--------------------------------------------------------------------------
                            | Amounts
                            |--------------------------------------------------------------------------
                            */

                            'subtotal' => (string)
                                $order->subtotal,

                            'total' => (string)
                                $order->total,

                            /*
                            |--------------------------------------------------------------------------
                            | Counts
                            |--------------------------------------------------------------------------
                            */

                            'total_quantity' => $order
                                ->totalQuantity(),

                            'items_count' => $order
                                ->items_count,

                            /*
                            |--------------------------------------------------------------------------
                            | Product Preview
                            |--------------------------------------------------------------------------
                            */

                            'preview_item' => $previewItem
                                    ? [
                                        'id' => $previewItem
                                            ->id,

                                        'product_name' => $previewItem
                                            ->product_name,

                                        'product_code' => $previewItem
                                            ->product_code,

                                        'variant_name' => $previewItem
                                            ->variant_name,

                                        'program' => $previewItem
                                            ->program,

                                        'size' => $previewItem
                                            ->size,

                                        'quantity' => $previewItem
                                            ->quantity,

                                        'image_url' => $previewImageUrl,
                                    ]
                                    : null,

                            'additional_items_count' => $additionalItemsCount,

                            /*
                            |--------------------------------------------------------------------------
                            | Transaction
                            |--------------------------------------------------------------------------
                            */

                            'transaction_number' => $order
                                ->transaction_number,

                            /*
                            |--------------------------------------------------------------------------
                            | Display Dates — Philippine Time
                            |--------------------------------------------------------------------------
                            */

                            'created_at' => $this
                                ->formatDateTime(
                                    $order
                                        ->created_at,
                                ),

                            'paid_at' => $this
                                ->formatDateTime(
                                    $order
                                        ->paid_at,
                                ),

                            'ready_for_release_at' => $this
                                ->formatDateTime(
                                    $order
                                        ->ready_for_release_at,
                                ),

                            'released_at' => $this
                                ->formatDateTime(
                                    $order
                                        ->released_at,
                                ),

                            'cancelled_at' => $this
                                ->formatDateTime(
                                    $order
                                        ->cancelled_at,
                                ),

                            /*
                            |--------------------------------------------------------------------------
                            | ISO Dates
                            |--------------------------------------------------------------------------
                            |
                            | Keep these as ISO timestamps.
                            | JavaScript uses them for date filters.
                            |
                            */

                            'created_at_iso' => $order
                                ->created_at
                                ?->toIso8601String(),

                            'paid_at_iso' => $order
                                ->paid_at
                                ?->toIso8601String(),

                            'released_at_iso' => $order
                                ->released_at
                                ?->toIso8601String(),
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'student/Orders/Index',
            [
                'orderSummary' => [
                    'pending_payment' => $pendingPayment,

                    'paid' => $paid,

                    'ready_for_release' => $readyForRelease,

                    'released' => $released,
                ],

                'historySummary' => [
                    'paid_today' => $paidToday,

                    'released_today' => $releasedToday,
                ],

                'orders' => $orders,
            ],
        );
    }

    /**
     * Existing show method retained.
     *
     * Note:
     * The actual /student/orders/{order}
     * route currently uses
     * StudentOrderDetailsController@show.
     */
    public function show(
        Request $request,
        Order $order,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        $student =
            $user->student;

        abort_unless(
            $student,
            403,
            'This account does not have a student profile.',
        );

        abort_unless(
            $order->student_id
                === $student->id,
            403,
            'You are not allowed to view this order.',
        );

        $order->load([
            'student.user',
            'creator',
            'items.productVariant.product',
        ]);

        return Inertia::render(
            'student/Orders/Show',
            [
                'order' => [
                    'id' => $order->id,

                    'order_number' => $order
                        ->order_number,

                    'order_type' => $order
                        ->order_type,

                    'payment_status' => $order
                        ->payment_status,

                    'fulfillment_status' => $order
                        ->fulfillment_status,

                    'subtotal' => (string)
                        $order->subtotal,

                    'total' => (string)
                        $order->total,

                    'qr_token' => $order->qr_token,

                    'release_qr_token' => $order
                        ->release_qr_token,

                    'release_qr_used' => $order
                        ->release_qr_used_at
                            !== null,

                    'transaction_number' => $order
                        ->transaction_number,

                    'total_quantity' => $order
                        ->totalQuantity(),

                    'created_at' => $this
                        ->formatDateTime(
                            $order
                                ->created_at,
                        ),

                    'paid_at' => $this
                        ->formatDateTime(
                            $order
                                ->paid_at,
                        ),

                    'ready_for_release_at' => $this
                        ->formatDateTime(
                            $order
                                ->ready_for_release_at,
                        ),

                    'released_at' => $this
                        ->formatDateTime(
                            $order
                                ->released_at,
                        ),

                    'cancelled_at' => $this
                        ->formatDateTime(
                            $order
                                ->cancelled_at,
                        ),

                    'student' => [
                        'name' => $order
                            ->student
                            ->user
                            ->name,

                        'student_id' => $order
                            ->student
                            ->student_id,

                        'course' => $order
                            ->student
                            ->course,

                        'year_level' => $order
                            ->student
                            ->year_level,
                    ],

                    'items' => $order
                        ->items
                        ->map(
                            function (
                                $item,
                            ): array {
                                $product =
                                    $item
                                        ->productVariant
                                        ?->product;

                                $imageUrl =
                                    $product
                                        ?->image_path
                                    ? '/storage/'
                                        .ltrim(
                                            $product
                                                ->image_path,
                                            '/',
                                        )
                                    : null;

                                return [
                                    'id' => $item->id,

                                    'product_code' => $item
                                        ->product_code,

                                    'product_name' => $item
                                        ->product_name,

                                    'variant_name' => $item
                                        ->variant_name,

                                    'sku' => $item->sku,

                                    'program' => $item->program,

                                    'size' => $item->size,

                                    'item_type' => $item
                                        ->item_type,

                                    'quantity' => $item
                                        ->quantity,

                                    'unit_price' => (string)
                                        $item
                                            ->unit_price,

                                    'line_total' => (string)
                                        $item
                                            ->line_total,

                                    'image_url' => $imageUrl,
                                ];
                            },
                        )
                        ->values(),
                ],
            ],
        );
    }

    /**
     * Convert stored UTC timestamps
     * to Philippine display time.
     */
    private function formatDateTime(
        ?CarbonInterface $dateTime,
    ): ?string {
        if (! $dateTime) {
            return null;
        }

        return $dateTime
            ->copy()
            ->timezone(
                self::DISPLAY_TIMEZONE,
            )
            ->format(
                'M d, Y h:i A',
            );
    }
}
