<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Notification;
use App\Models\OrderItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class WaitingListController extends Controller
{
    /**
     * Display preorder / waiting-list entries.
     *
     * Shared by Admin and Specialist — Specialist is the one who
     * actually receives stock (which triggers allocation) and
     * releases orders (which requires this page's Process step),
     * so this is a working tool for them, not just Admin oversight.
     */
    public function index(
        Request $request,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && in_array(
                $user->role,
                [
                    'super_admin',
                    'admin',
                    'specialist',
                ],
                true,
            ),
            403,
        );
        /*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */

        $search =
            trim(
                $request
                    ->string(
                        'search',
                    )
                    ->toString(),
            );

        $status =
            $request
                ->string(
                    'status',
                )
                ->toString();

        if (
            ! in_array(
                $status,
                [
                    '',
                    OrderItem::PREORDER_STATUS_WAITING,
                    OrderItem::PREORDER_STATUS_READY,
                    OrderItem::PREORDER_STATUS_PAID,
                    OrderItem::PREORDER_STATUS_EXPIRED,
                ],
                true,
            )
        ) {
            $status =
                '';
        }

        /*
        |--------------------------------------------------------------------------
        | Preorder Items
        |--------------------------------------------------------------------------
        */

        $query =
            OrderItem::query()
                ->with([
                    'order.student.user',
                ])
                ->where(
                    'item_type',
                    OrderItem::TYPE_PREORDER,
                );

        /*
        |--------------------------------------------------------------------------
        | Status Filter
        |--------------------------------------------------------------------------
        |
        | With no explicit filter, expired entries are hidden by
        | default — their reservation was already released and they
        | need no further attention, so they would only be clutter.
        */

        if ($status !== '') {
            $query->where(
                'preorder_status',
                $status,
            );
        } else {
            $query->where(
                'preorder_status',
                '!=',
                OrderItem::PREORDER_STATUS_EXPIRED,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        */

        if (
            $search !== ''
        ) {
            $query->where(
                function (
                    $query,
                ) use (
                    $search,
                ): void {
                    $query
                        ->where(
                            'product_name',
                            'like',
                            "%{$search}%",
                        )
                        ->orWhere(
                            'product_code',
                            'like',
                            "%{$search}%",
                        )
                        ->orWhere(
                            'variant_name',
                            'like',
                            "%{$search}%",
                        )
                        ->orWhere(
                            'sku',
                            'like',
                            "%{$search}%",
                        )
                        ->orWhereHas(
                            'order.student',
                            function (
                                $studentQuery,
                            ) use (
                                $search,
                            ): void {
                                $studentQuery
                                    ->where(
                                        'student_id',
                                        'like',
                                        "%{$search}%",
                                    )
                                    ->orWhereHas(
                                        'user',
                                        fn (
                                            $userQuery,
                                        ) => $userQuery
                                            ->where(
                                                'name',
                                                'like',
                                                "%{$search}%",
                                            ),
                                    );
                            },
                        );
                },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Fetch Waiting List
        |--------------------------------------------------------------------------
        |
        | Oldest entries first — they have been waiting the longest,
        | so they take priority for processing (matches the FIFO
        | order PreorderAvailabilityService already allocates in).
        */

        $waitingItems =
            $query
                ->oldest()
                ->paginate(
                    15,
                )
                ->withQueryString()
                ->through(
                    function (
                        OrderItem $item,
                    ): array {

                        /*
                            |--------------------------------------------------------------------------
                            | Current Inventory
                            |--------------------------------------------------------------------------
                            */

                        $inventory =
                            Inventory::query()
                                ->where(
                                    'product_variant_id',
                                    $item
                                        ->product_variant_id,
                                )
                                ->first();

                        $availableQuantity =
                            $inventory
                                ? max(
                                    0,
                                    (int)
                                    $inventory
                                        ->quantity_on_hand
                                    -
                                    (int)
                                    $inventory
                                        ->quantity_reserved,
                                )
                                : 0;

                        $student =
                            $item
                                ->order
                                ?->student;

                        $studentUser =
                            $student
                                ?->user;

                        return [
                            'id' => $item->id,

                            'order_id' => $item
                                ->order_id,

                            'order_number' => $item
                                ->order
                                ?->order_number
                                ?? 'N/A',

                            'product_variant_id' => $item
                                ->product_variant_id,

                            'product_code' => $item
                                ->product_code,

                            'product_name' => $item
                                ->product_name,

                            'variant_name' => $item
                                ->variant_name
                                ?: 'Standard',

                            'sku' => $item->sku,

                            'program' => $item
                                ->program,

                            'size' => $item
                                ->size,

                            'quantity' => (int)
                                $item
                                    ->quantity,

                            'unit_price' => (string)
                                $item
                                    ->unit_price,

                            'line_total' => (string)
                                $item
                                    ->line_total,

                            'student' => [
                                'name' => $studentUser
                                    ?->name
                                    ?? 'Unknown Student',

                                'student_id' => $student
                                    ?->student_id
                                    ?? 'N/A',

                                'course' => $student
                                    ?->course,

                                'year_level' => $student
                                    ?->year_level,
                            ],

                            'inventory' => [
                                'quantity_on_hand' => $inventory
                                        ? (int)
                                        $inventory
                                            ->quantity_on_hand
                                        : 0,

                                'quantity_reserved' => $inventory
                                        ? (int)
                                        $inventory
                                            ->quantity_reserved
                                        : 0,

                                'available_quantity' => $availableQuantity,

                                'reorder_level' => $inventory
                                        ? (int)
                                        $inventory
                                            ->reorder_level
                                        : 0,
                            ],

                            'waiting_status' => $item
                                ->preorder_status,

                            'created_at' => $item
                                ->created_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),
                        ];
                    },
                );

        /*
        |--------------------------------------------------------------------------
        | Summary
        |--------------------------------------------------------------------------
        |
        | preorder_status is the authoritative record of where each
        | item actually stands — no need to re-simulate FIFO
        | allocation against live inventory just to count entries.
        */

        $allPreorderItems =
            OrderItem::query()
                ->where(
                    'item_type',
                    OrderItem::TYPE_PREORDER,
                );

        $waitingCount =
            (clone $allPreorderItems)
                ->where(
                    'preorder_status',
                    OrderItem::PREORDER_STATUS_WAITING,
                )
                ->count();

        $readyCount =
            (clone $allPreorderItems)
                ->where(
                    'preorder_status',
                    OrderItem::PREORDER_STATUS_READY,
                )
                ->count();

        $paidCount =
            (clone $allPreorderItems)
                ->where(
                    'preorder_status',
                    OrderItem::PREORDER_STATUS_PAID,
                )
                ->count();

        $expiredCount =
            (clone $allPreorderItems)
                ->where(
                    'preorder_status',
                    OrderItem::PREORDER_STATUS_EXPIRED,
                )
                ->count();

        $totalQuantity =
            (int) (clone $allPreorderItems)
                ->sum('quantity');

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'staff/WaitingList/Index',
            [
                'waitingItems' => $waitingItems,

                'filters' => [
                    'search' => $search,

                    'status' => $status,
                ],

                'summary' => [
                    'total_entries' => $waitingCount
                        + $readyCount
                        + $paidCount
                        + $expiredCount,

                    'waiting' => $waitingCount,

                    'ready' => $readyCount,

                    'paid' => $paidCount,

                    'expired' => $expiredCount,

                    'total_quantity' => $totalQuantity,
                ],
            ],
        );
    }

    /**
     * Convert a ready or paid preorder item into a normal order
     * item so it can be released.
     */
    public function process(
        Request $request,
        OrderItem $orderItem,
    ): RedirectResponse {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Admin Or Specialist
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && in_array(
                $user->role,
                [
                    'super_admin',
                    'admin',
                    'specialist',
                ],
                true,
            ),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Must Still Be A Preorder
        |--------------------------------------------------------------------------
        */

        if (
            $orderItem->item_type
            !==
            OrderItem::TYPE_PREORDER
        ) {
            throw ValidationException::withMessages([
                'preorder' => 'This preorder has already been processed.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Must Already Be Ready Or Paid
        |--------------------------------------------------------------------------
        |
        | Inventory is reserved exactly once, automatically, by
        | PreorderAvailabilityService when the item first becomes
        | "ready" (stock received). This action must never reserve
        | inventory itself — only "waiting" or "expired" items have
        | no reservation yet, and neither is eligible here.
        */

        if (
            ! in_array(
                $orderItem->preorder_status,
                [
                    OrderItem::PREORDER_STATUS_READY,
                    OrderItem::PREORDER_STATUS_PAID,
                ],
                true,
            )
        ) {
            throw ValidationException::withMessages([
                'preorder' => 'This preorder is not ready yet. Stock must be reserved for it before it can be processed.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Process Transaction
        |--------------------------------------------------------------------------
        */

        DB::transaction(
            function () use (
                $orderItem,
            ): void {
                /*
                |--------------------------------------------------------------------------
                | Reload + Lock Order Item
                |--------------------------------------------------------------------------
                */

                $lockedItem =
                    OrderItem::query()
                        ->whereKey(
                            $orderItem->id,
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                if (
                    $lockedItem->item_type
                    !==
                    OrderItem::TYPE_PREORDER
                ) {
                    throw ValidationException::withMessages([
                        'preorder' => 'This preorder has already been processed.',
                    ]);
                }

                if (
                    ! in_array(
                        $lockedItem->preorder_status,
                        [
                            OrderItem::PREORDER_STATUS_READY,
                            OrderItem::PREORDER_STATUS_PAID,
                        ],
                        true,
                    )
                ) {
                    throw ValidationException::withMessages([
                        'preorder' => 'This preorder is not ready yet. Stock must be reserved for it before it can be processed.',
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Convert Preorder To Normal Order Item
                |--------------------------------------------------------------------------
                |
                | We keep the same Order record and OrderItem record.
                | Only its processing type changes. Inventory is NOT
                | touched here — it was already reserved when this
                | item became "ready".
                |
                */

                $lockedItem->update([
                    'item_type' => OrderItem::TYPE_ORDER,
                ]);
            },
            attempts: 3,
        );

        /*
        |--------------------------------------------------------------------------
        | Reload Order + Student
        |--------------------------------------------------------------------------
        */

        $orderItem->refresh();

        $orderItem->load([
            'order.student.user',
        ]);

        $order =
            $orderItem
                ->order;

        $studentUser =
            $order
                ?->student
                ?->user;

        /*
        |--------------------------------------------------------------------------
        | Student Notification
        |--------------------------------------------------------------------------
        */

        if (
            $studentUser
            && $order
        ) {
            $alreadyNotified =
                Notification::query()
                    ->where(
                        'user_id',
                        $studentUser->id,
                    )
                    ->where(
                        'type',
                        'preorder_processed',
                    )
                    ->where(
                        'link',
                        "/student/orders/{$order->id}",
                    )
                    ->exists();

            if (! $alreadyNotified) {
                $alreadyPaid =
                    $orderItem->preorder_status
                    === OrderItem::PREORDER_STATUS_PAID;

                Notification::query()
                    ->create([
                        'user_id' => $studentUser->id,

                        'type' => 'preorder_processed',

                        'title' => $alreadyPaid
                            ? 'Preorder Ready for Claiming'
                            : 'Preorder Ready for Payment',

                        'message' => $alreadyPaid
                            ? "{$orderItem->product_name} ({$orderItem->variant_name}) "
                                ."from order {$order->order_number} is now ready "
                                .'for release. You may proceed with the normal '
                                .'claiming process.'
                            : "{$orderItem->product_name} ({$orderItem->variant_name}) "
                                ."from order {$order->order_number} has been reserved "
                                .'for you. You may now proceed with the normal payment '
                                .'and claiming process.',

                        'link' => "/student/orders/{$order->id}",

                        'read_at' => null,
                    ]);
            }
        }

        return back()->with(
            'success',
            'Preorder processed successfully. It is now a normal order item.',
        );
    }
}
