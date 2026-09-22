<?php

namespace App\Http\Controllers\Specialist;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrderItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PreorderConfigurationController extends Controller
{
    /**
     * Configure preorder settings for a genuinely NEW
     * purchase-order merchandise item.
     */
    public function update(
        Request $request,
        PurchaseOrderItem $purchaseOrderItem,
    ): RedirectResponse {
        /*
        |--------------------------------------------------------------------------
        | Specialist Only
        |--------------------------------------------------------------------------
        */

        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'specialist',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | NEW Merchandise Guard
        |--------------------------------------------------------------------------
        |
        | Only merchandise explicitly classified as NEW from the
        | Admin Purchase Order flow may use preorder configuration.
        |
        */

        abort_unless(
            $purchaseOrderItem->merchandise_origin
                === PurchaseOrderItem::ORIGIN_NEW,
            422,
            'Only new merchandise can be configured for preorder.',
        );

        /*
        |--------------------------------------------------------------------------
        | Registered Product Guard
        |--------------------------------------------------------------------------
        |
        | The PO item must already be registered as a PROWARE
        | product before preorder settings can be configured.
        |
        */

        abort_unless(
            $purchaseOrderItem->product_variant_id !== null,
            422,
            'Register this new merchandise as a PROWARE product first.',
        );

        $purchaseOrderItem->load(
            'productVariant.product',
        );

        $product =
            $purchaseOrderItem
                ->productVariant
                ?->product;

        abort_unless(
            $product instanceof Product,
            422,
            'The product linked to this purchase-order item could not be found.',
        );

        /*
        |--------------------------------------------------------------------------
        | Validation
        |--------------------------------------------------------------------------
        */

        /*
        |--------------------------------------------------------------------------
        | Preorder Capacity Cannot Exceed What Was Actually Ordered
        |--------------------------------------------------------------------------
        |
        | This item's own purchase-order quantity is the real ceiling: PROWARE
        | can never promise more preorder units than it actually ordered from
        | the supplier. Both the total capacity and the per-student limit are
        | capped at that same number.
        */

        $quantityOrdered = (int) $purchaseOrderItem->quantity_ordered;

        $validated = $request->validate([
            'preorder_enabled' => [
                'required',
                'boolean',
            ],

            'expected_release_date' => [
                'nullable',
                'date',
            ],

            'preorder_starts_at' => [
                'nullable',
                'date',
            ],

            'preorder_ends_at' => [
                'nullable',
                'date',
                'after:preorder_starts_at',
            ],

            'preorder_limit_per_student' => [
                'nullable',
                'integer',
                'min:1',
                "max:{$quantityOrdered}",
            ],

            'preorder_capacity' => [
                'nullable',
                'integer',
                'min:1',
                "max:{$quantityOrdered}",
            ],

            /*
            |--------------------------------------------------------------------------
            | Payment Deadline
            |--------------------------------------------------------------------------
            |
            | At least 3 days (72 hours), so a student who reserved an
            | early-bird discount slot has fair time to pay before losing it.
            | At most 30 days, so an unpaid "ready" preorder cannot sit
            | forever and block that stock from everyone else.
            */

            'preorder_payment_deadline_hours' => [
                'nullable',
                'integer',
                'min:72',
                'max:720',
            ],

            'preorder_early_bird_slots' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'preorder_early_bird_discount_percent' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],

            /*
             * How long the "New" badge shows once the product actually
             * becomes available, capped at 90 days so it stays a
             * temporary indicator rather than a permanent one.
             */
            'new_badge_duration_days' => [
                'nullable',
                'integer',
                'min:1',
                'max:90',
            ],
        ], [
            'preorder_capacity.max' => "The preorder capacity cannot exceed the {$quantityOrdered} unit(s) ordered from the supplier.",

            'preorder_limit_per_student.max' => "The per-student preorder limit cannot exceed the {$quantityOrdered} unit(s) ordered from the supplier.",

            'preorder_payment_deadline_hours.min' => 'The payment deadline must be at least 3 days (72 hours), so students have fair time to pay.',

            'preorder_payment_deadline_hours.max' => 'The payment deadline cannot exceed 30 days (720 hours).',

            'new_badge_duration_days.max' => 'The "New" badge duration cannot exceed 90 days.',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Cross-Field Validation
        |--------------------------------------------------------------------------
        */

        if (
            ! empty($validated['preorder_early_bird_slots'])
            &&
            ! empty($validated['preorder_capacity'])
            &&
            $validated['preorder_early_bird_slots']
                > $validated['preorder_capacity']
        ) {
            return back()
                ->withErrors([
                    'preorder_early_bird_slots' => 'Early-bird slots cannot exceed the preorder capacity.',
                ])
                ->withInput();
        }

        /*
        |--------------------------------------------------------------------------
        | Save Configuration
        |--------------------------------------------------------------------------
        */

        DB::transaction(
            function () use (
                $product,
                $validated,
            ): void {
                $preorderEnabled =
                    (bool) $validated['preorder_enabled'];

                $product->update([
                    'availability_status' => Product::AVAILABILITY_COMING_SOON,

                    'preorder_enabled' => $preorderEnabled,

                    'expected_release_date' => $validated['expected_release_date']
                        ?? null,

                    'preorder_starts_at' => $preorderEnabled
                            ? (
                                $validated['preorder_starts_at']
                                ?? null
                            )
                            : null,

                    'preorder_ends_at' => $preorderEnabled
                            ? (
                                $validated['preorder_ends_at']
                                ?? null
                            )
                            : null,

                    'preorder_limit_per_student' => $preorderEnabled
                            ? (
                                $validated[
                                    'preorder_limit_per_student'
                                ]
                                ?? null
                            )
                            : null,

                    'preorder_capacity' => $preorderEnabled
                            ? (
                                $validated[
                                    'preorder_capacity'
                                ]
                                ?? null
                            )
                            : null,

                    'preorder_payment_deadline_hours' => $preorderEnabled
                            ? (
                                $validated[
                                    'preorder_payment_deadline_hours'
                                ]
                                ?? null
                            )
                            : null,

                    'preorder_early_bird_slots' => $preorderEnabled
                            ? (
                                $validated[
                                    'preorder_early_bird_slots'
                                ]
                                ?? null
                            )
                            : null,

                    'preorder_early_bird_discount_percent' => $preorderEnabled
                            ? (
                                $validated[
                                    'preorder_early_bird_discount_percent'
                                ]
                                ?? null
                            )
                            : null,

                    'new_badge_duration_days' => $validated[
                            'new_badge_duration_days'
                        ]
                        ?? null,

                    /*
                     * Do NOT start the NEW/HOT timer here.
                     * Stock Receipt will start this timestamp when
                     * physical stock is first received.
                     */
                    'new_badge_started_at' => null,
                ]);
            },
            attempts: 3,
        );

        return back()->with(
            'success',
            $validated['preorder_enabled']
                ? 'Preorder configuration saved successfully.'
                : 'Preorder has been disabled for this merchandise.',
        );
    }
}
