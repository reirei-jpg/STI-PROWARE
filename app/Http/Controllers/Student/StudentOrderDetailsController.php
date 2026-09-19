<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentOrderDetailsController extends Controller
{
    private const DISPLAY_TIMEZONE =
        'Asia/Manila';

    /**
     * Display one order belonging to
     * the currently logged-in student.
     */
    public function show(
        Request $request,
        Order $order,
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
        | Ownership
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $order->student_id
                === $student->id,
            403,
            'You are not allowed to view this order.',
        );

        /*
        |--------------------------------------------------------------------------
        | Relationships
        |--------------------------------------------------------------------------
        |
        | We need the parent Product so every
        | OrderItem can display its merchandise image.
        |
        */

        $order->load([
            'student.user',
            'canceller',
            'items.productVariant.product',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'student/Orders/Show',
            [
                'order' => [
                    /*
                    |--------------------------------------------------------------------------
                    | Basic Information
                    |--------------------------------------------------------------------------
                    */

                    'id' => $order->id,

                    'order_number' => $order->order_number,

                    'order_type' => $order->order_type,

                    /*
                    |--------------------------------------------------------------------------
                    | Status
                    |--------------------------------------------------------------------------
                    */

                    'payment_status' => $order->payment_status,

                    'fulfillment_status' => $order->fulfillment_status,

                    'payment_method' => $order->payment_method,

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
                    | Payment QR
                    |--------------------------------------------------------------------------
                    */

                    'qr_token' => $order->payment_status
                            === Order::PAYMENT_PENDING
                        ? $order->qr_token
                        : null,

                    /*
                    |--------------------------------------------------------------------------
                    | Release QR
                    |--------------------------------------------------------------------------
                    */

                    'release_qr_token' => $order
                        ->release_qr_token,

                    'release_qr_used' => $order
                        ->release_qr_used_at
                            !== null,

                    /*
                    |--------------------------------------------------------------------------
                    | Transaction
                    |--------------------------------------------------------------------------
                    */

                    'transaction_number' => $order
                        ->transaction_number,

                    /*
                    |--------------------------------------------------------------------------
                    | Quantity
                    |--------------------------------------------------------------------------
                    */

                    'total_quantity' => $order
                        ->totalQuantity(),

                    /*
                    |--------------------------------------------------------------------------
                    | Dates
                    |--------------------------------------------------------------------------
                    |
                    | Database remains UTC.
                    | Only displayed values are converted
                    | to Philippine time.
                    |
                    */

                    'created_at' => $this->formatDateTime(
                        $order->created_at,
                    ),

                    'paid_at' => $this->formatDateTime(
                        $order->paid_at,
                    ),

                    'ready_for_release_at' => $this->formatDateTime(
                        $order
                            ->ready_for_release_at,
                    ),

                    'released_at' => $this->formatDateTime(
                        $order->released_at,
                    ),

                    'cancelled_at' => $this->formatDateTime(
                        $order->cancelled_at,
                    ),

                    /*
                    |--------------------------------------------------------------------------
                    | Cancellation
                    |--------------------------------------------------------------------------
                    */

                    'cancel_url' => route(
                        'student.orders.cancel',
                        $order,
                        false,
                    ),

                    'cancel_blocked_reason' => $order
                        ->studentCancelBlockedReason(),

                    'cancel_until' => $this->formatDateTime(
                        $order
                            ->studentCancelDeadline(),
                    ),

                    'cancellation' => $order
                        ->cancellationSummary(),

                    /*
                    |--------------------------------------------------------------------------
                    | Student
                    |--------------------------------------------------------------------------
                    |
                    | Retained in backend data even though
                    | the student-facing Show page no longer
                    | needs a large Student Information card.
                    |
                    */

                    'student' => [
                        'name' => $order
                            ->student
                            ?->user
                            ?->name
                            ?? 'Unknown Student',

                        'student_id' => $order
                            ->student
                            ?->student_id
                            ?? 'N/A',

                        'course' => $order
                            ->student
                            ?->course,

                        'year_level' => $order
                            ->student
                            ?->year_level,
                    ],

                    /*
                    |--------------------------------------------------------------------------
                    | Ordered Items
                    |--------------------------------------------------------------------------
                    */

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

                                /*
                                    |--------------------------------------------------------------------------
                                    | Relative Product Image URL
                                    |--------------------------------------------------------------------------
                                    |
                                    | This works whether PROWARE is opened using:
                                    |
                                    | localhost
                                    | LAN IP
                                    | Caddy HTTPS
                                    | phone browser
                                    |
                                    */

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

                                    'preorder_status' => $item
                                        ->preorder_status,

                                    'preorder_ready_at' => $this->formatDateTime(
                                        $item
                                            ->preorder_ready_at,
                                    ),

                                    'preorder_notified_at' => $this->formatDateTime(
                                        $item
                                            ->preorder_notified_at,
                                    ),

                                    'preorder_payment_deadline_at' => $this->formatDateTime(
                                        $item
                                            ->preorder_payment_deadline_at,
                                    ),

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
     * Convert a UTC Laravel timestamp
     * into Philippine display time.
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
