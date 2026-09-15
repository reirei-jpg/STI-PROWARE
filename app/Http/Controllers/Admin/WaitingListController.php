<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Notification;
use App\Models\OrderItem;
use App\Services\PreorderAvailabilityService;
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
     */
    public function index(
        Request $request,
        PreorderAvailabilityService $preorderAvailabilityService,
    ): Response {
        $user =
            $request->user();

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
                    'waiting',
                    'ready',
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
| FIFO Readiness Map
|--------------------------------------------------------------------------
*/

        $variantIds =
            (clone $query)
                ->pluck(
                    'product_variant_id',
                )
                ->filter()
                ->unique()
                ->values();

        $readinessMap =
            [];

        foreach (
            $variantIds as $variantId
        ) {
            $readinessMap +=
                $preorderAvailabilityService
                    ->readinessForVariant(
                        (int)
                        $variantId,
                    );
        }
        /*
        |--------------------------------------------------------------------------
        | Fetch Waiting List
        |--------------------------------------------------------------------------
        */

        $waitingItems =
            $query
                ->latest()
                ->paginate(
                    15,
                )
                ->withQueryString()
                ->through(
                    function (
                        OrderItem $item,
                    ) use (
                        $readinessMap,
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

                        /*
                        |--------------------------------------------------------------------------
                        | Waiting Status
                        |--------------------------------------------------------------------------
                        |
                        | A preorder is "ready" once enough stock exists for the
                        | requested quantity.
                        |
                        */

                        $waitingStatus =
                        $readinessMap[
                            $item->id
                        ]
                        ?? 'waiting';

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

                            'waiting_status' => $waitingStatus,

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
        | Status Filter
        |--------------------------------------------------------------------------
        |
        | Because "ready" is calculated using current inventory, filter the
        | transformed collection instead of the database query.
        |
        */

        if (
            $status !== ''
        ) {
            $filtered =
                collect(
                    $waitingItems
                        ->items(),
                )
                    ->filter(
                        fn (
                            array $item,
                        ): bool => $item[
                                'waiting_status'
                            ]
                            ===
                            $status,
                    )
                    ->values();

            $waitingItems
                ->setCollection(
                    $filtered,
                );
        }

        /*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
*/

        $allPreorders =
            OrderItem::query()
                ->where(
                    'item_type',
                    OrderItem::TYPE_PREORDER,
                )
                ->get();

        $allVariantIds =
            $allPreorders
                ->pluck(
                    'product_variant_id',
                )
                ->filter()
                ->unique()
                ->values();

        $allReadiness =
            [];

        foreach (
            $allVariantIds as $variantId
        ) {
            $allReadiness +=
                $preorderAvailabilityService
                    ->readinessForVariant(
                        (int)
                        $variantId,
                    );
        }

        $waitingCount =
            0;

        $readyCount =
            0;

        $totalQuantity =
            0;

        foreach (
            $allPreorders as $item
        ) {
            $totalQuantity +=
                (int)
                $item->quantity;

            if (
                (
                    $allReadiness[
                        $item->id
                    ]
                    ?? 'waiting'
                )
                ===
                'ready'
            ) {
                $readyCount++;

                continue;
            }

            $waitingCount++;
        }

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/WaitingList/Index',
            [
                'waitingItems' => $waitingItems,

                'filters' => [
                    'search' => $search,

                    'status' => $status,
                ],

                'summary' => [
                    'total_entries' => $allPreorders
                        ->count(),

                    'waiting' => $waitingCount,

                    'ready' => $readyCount,

                    'total_quantity' => $totalQuantity,
                ],
            ],
        );
    }
    /**
     * Return FIFO readiness for preorder items of one variant.
     *
     * @return array<int, string>
     */

    /**
     * Convert a ready preorder item into a normal order item
     * and reserve its inventory.
     */
    public function process(
        Request $request,
        OrderItem $orderItem,
        PreorderAvailabilityService $preorderAvailabilityService,
    ): RedirectResponse {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Admin Only
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && $user->isAdminLevel(),
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
        | Check FIFO Readiness Before Transaction
        |--------------------------------------------------------------------------
        */

        $readiness =
            $preorderAvailabilityService
                ->readinessForVariant(
                    (int)
                    $orderItem
                        ->product_variant_id,
                );

        if (
            (
                $readiness[
                    $orderItem->id
                ]
                ?? 'waiting'
            )
            !==
            'ready'
        ) {
            throw ValidationException::withMessages([
                'preorder' => 'This preorder is not ready yet because there is not enough stock available for its FIFO position.',
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

                /*
                |--------------------------------------------------------------------------
                | Lock Inventory
                |--------------------------------------------------------------------------
                */

                $inventory =
                    Inventory::query()
                        ->where(
                            'product_variant_id',
                            $lockedItem
                                ->product_variant_id,
                        )
                        ->lockForUpdate()
                        ->first();

                if (! $inventory) {
                    throw ValidationException::withMessages([
                        'inventory' => 'No inventory record exists for this preorder variant.',
                    ]);
                }

                $available =
                    max(
                        0,
                        (int)
                        $inventory
                            ->quantity_on_hand
                        -
                        (int)
                        $inventory
                            ->quantity_reserved,
                    );

                $requested =
                    (int)
                    $lockedItem
                        ->quantity;

                if (
                    $available <
                    $requested
                ) {
                    throw ValidationException::withMessages([
                        'inventory' => "Only {$available} unit(s) are currently available. This preorder requires {$requested}.",
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Reserve Inventory
                |--------------------------------------------------------------------------
                */

                $inventory->update([
                    'quantity_reserved' => (int)
                        $inventory
                            ->quantity_reserved
                        +
                        $requested,
                ]);

                /*
                |--------------------------------------------------------------------------
                | Convert Preorder To Normal Order Item
                |--------------------------------------------------------------------------
                |
                | We keep the same Order record and OrderItem record.
                | Only its processing type changes.
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
                Notification::query()
                    ->create([
                        'user_id' => $studentUser->id,

                        'type' => 'preorder_processed',

                        'title' => 'Preorder Ready for Payment',

                        'message' => "{$orderItem->product_name} ({$orderItem->variant_name}) "
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
            'Preorder processed successfully. Stock has been reserved for the student.',
        );
    }

    public function readinessForVariant(
        int $productVariantId,
    ): array {
        $inventory =
            Inventory::query()
                ->where(
                    'product_variant_id',
                    $productVariantId,
                )
                ->first();

        $remainingAvailable =
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

        $items =
            OrderItem::query()
                ->where(
                    'product_variant_id',
                    $productVariantId,
                )
                ->where(
                    'item_type',
                    OrderItem::TYPE_PREORDER,
                )
                ->whereHas(
                    'order',
                    function (
                        $query,
                    ): void {
                        $query
                            ->where(
                                'fulfillment_status',
                                '!=',
                                'released',
                            )
                            ->where(
                                'fulfillment_status',
                                '!=',
                                'cancelled',
                            )
                            ->where(
                                'payment_status',
                                '!=',
                                'cancelled',
                            );
                    },
                )
                ->orderBy(
                    'created_at',
                )
                ->orderBy(
                    'id',
                )
                ->get();

        $statuses =
            [];

        foreach (
            $items as $item
        ) {
            $requested =
                (int)
                $item->quantity;

            if (
                $requested > 0
                &&
                $remainingAvailable >=
                $requested
            ) {
                $statuses[
                    $item->id
                ] =
                    'ready';

                $remainingAvailable -=
                    $requested;

                continue;
            }

            $statuses[
                $item->id
            ] =
                'waiting';
        }

        return $statuses;
    }
}
