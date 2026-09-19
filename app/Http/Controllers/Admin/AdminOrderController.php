<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminOrderController extends Controller
{
    /**
     * Display all PROWARE orders for Admin oversight.
     */
    public function index(
        Request $request,
    ): Response {
        $user = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */

        $search =
            trim(
                (string)
                $request->query(
                    'search',
                    '',
                ),
            );

        $status =
            (string)
            $request->query(
                'status',
                'all',
            );

        $allowedStatuses = [
            'all',
            'pending_payment',
            'paid',
            'released',
            'cancelled',
        ];

        if (
            ! in_array(
                $status,
                $allowedStatuses,
                true,
            )
        ) {
            $status =
                'all';
        }

        /*
        |--------------------------------------------------------------------------
        | Main Query
        |--------------------------------------------------------------------------
        */

        $query =
            Order::query()
                ->with([
                    'student.user',
                ]);

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        |
        | Admin can search using:
        |
        | - Order number
        | - Student name
        | - Student ID
        |
        */

        if (
            $search !== ''
        ) {
            $query->where(
                function (
                    Builder $query,
                ) use (
                    $search,
                ): void {
                    $query
                        ->where(
                            'order_number',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhereHas(
                            'student',
                            function (
                                Builder $studentQuery,
                            ) use (
                                $search,
                            ): void {
                                $studentQuery
                                    ->where(
                                        'student_id',
                                        'ilike',
                                        '%'.$search.'%',
                                    )
                                    ->orWhereHas(
                                        'user',
                                        function (
                                            Builder $userQuery,
                                        ) use (
                                            $search,
                                        ): void {
                                            $userQuery
                                                ->where(
                                                    'name',
                                                    'ilike',
                                                    '%'.$search.'%',
                                                );
                                        },
                                    );
                            },
                        );
                },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Status Filters
        |--------------------------------------------------------------------------
        */

        if (
            $status ===
            'pending_payment'
        ) {
            $query->where(
                'payment_status',
                'pending',
            );
        }

        if (
            $status ===
            'paid'
        ) {
            $query
                ->where(
                    'payment_status',
                    'paid',
                )
                ->whereNull(
                    'released_at',
                );
        }

        if (
            $status ===
            'released'
        ) {
            $query->whereNotNull(
                'released_at',
            );
        }

        if (
            $status ===
            'cancelled'
        ) {
            $query->whereNotNull(
                'cancelled_at',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Pagination
        |--------------------------------------------------------------------------
        */

        $orders =
            $query
                ->latest()
                ->paginate(
                    20,
                )
                ->withQueryString()
                ->through(
                    function (
                        Order $order,
                    ): array {
                        return [
                            'id' => $order->id,

                            'order_number' => $order
                                ->order_number,

                            'source' => $order->source,

                            'order_type' => $order
                                ->order_type,

                            'payment_status' => $order
                                ->payment_status,

                            'fulfillment_status' => $order
                                ->fulfillment_status,

                            'total' => $order->total,

                            'paid_at' => $order
                                ->paid_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),

                            'released_at' => $order
                                ->released_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),

                            'created_at' => $order
                                ->created_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),

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
                            ],
                        ];
                    },
                );

        /*
        |--------------------------------------------------------------------------
        | Global Summary
        |--------------------------------------------------------------------------
        */

        $summary = [
            'total' => Order::query()
                ->count(),

            'pending_payment' => Order::query()
                ->where(
                    'payment_status',
                    'pending',
                )
                ->count(),

            'paid' => Order::query()
                ->where(
                    'payment_status',
                    'paid',
                )
                ->whereNull(
                    'released_at',
                )
                ->count(),

            'released' => Order::query()
                ->whereNotNull(
                    'released_at',
                )
                ->count(),

            'cancelled' => Order::query()
                ->whereNotNull(
                    'cancelled_at',
                )
                ->count(),
        ];

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/Orders/Index',
            [
                'orders' => $orders,

                'summary' => $summary,

                'filters' => [
                    'search' => $search,

                    'status' => $status,
                ],
            ],
        );
    }

    /**
     * Display one order for Admin inspection.
     */
    public function show(
        Request $request,
        Order $order,
    ): Response {
        $user = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Load Order
        |--------------------------------------------------------------------------
        */

        $order->load([
            'student.user',
            'canceller',
            'items',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/Orders/Show',
            [
                'order' => [
                    'id' => $order->id,

                    'order_number' => $order
                        ->order_number,

                    'source' => $order->source,

                    'order_type' => $order
                        ->order_type,

                    'payment_status' => $order
                        ->payment_status,

                    'fulfillment_status' => $order
                        ->fulfillment_status,

                    'subtotal' => $order->subtotal,

                    'total' => $order->total,

                    'created_at' => $order
                        ->created_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'paid_at' => $order
                        ->paid_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'released_at' => $order
                        ->released_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'cancelled_at' => $order
                        ->cancelled_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'can_cancel' => $order
                        ->canBeCancelledByStaff(),

                    'cancel_url' => route(
                        'admin.orders.cancel',
                        $order,
                        false,
                    ),

                    'cancellation' => $order
                        ->cancellationSummary(),

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

                    'items' => $order
                        ->items
                        ->map(
                            fn (
                                $item,
                            ): array => [
                                'id' => $item->id,

                                'product_code' => $item
                                    ->product_code,

                                'product_name' => $item
                                    ->product_name,

                                'variant_name' => $item
                                    ->variant_name,

                                'sku' => $item->sku,

                                'program' => $item
                                    ->program,

                                'size' => $item
                                    ->size,

                                'item_type' => $item
                                    ->item_type,

                                'quantity' => $item
                                    ->quantity,

                                'unit_price' => $item
                                    ->unit_price,

                                'line_total' => $item
                                    ->line_total,
                            ],
                        )
                        ->values(),
                ],
            ],
        );
    }
}
