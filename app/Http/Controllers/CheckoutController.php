<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubmitCheckoutRequest;
use App\Models\Cart;
use App\Models\CartItem;
use App\Services\CheckoutSubmitter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    /**
     * Show the final checkout review page.
     */
    public function index(
        Request $request,
    ): Response|RedirectResponse {
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

        $cart =
            Cart::query()
                ->where(
                    'student_id',
                    $student->id,
                )
                ->where(
                    'created_by',
                    $user->id,
                )
                ->where(
                    'source',
                    Cart::SOURCE_STUDENT_APP,
                )
                ->where(
                    'status',
                    Cart::STATUS_ACTIVE,
                )
                ->with([
                    'items' => function (
                        $query,
                    ): void {
                        $query
                            ->with([
                                'productVariant.product.category:id,name',
                            ])
                            ->latest();
                    },
                ])
                ->first();

        if (
            ! $cart
            || $cart->items->isEmpty()
        ) {
            return redirect()
                ->route(
                    'cart.index',
                )
                ->with(
                    'error',
                    'Your cart is empty.',
                );
        }

        $selectedItemIds =
    collect(
        explode(
            ',',
            (string) $request->query(
                'items',
                '',
            ),
        ),
    )
        ->filter()
        ->map(
            fn ($id) => (int) $id,
        )
        ->values();

        if (
            $selectedItemIds->isEmpty()
        ) {
            return redirect()
                ->route(
                    'cart.index',
                )
                ->with(
                    'error',
                    'Please select at least one cart item.',
                );
        }

        $selectedItems =
            $cart->items
                ->whereIn(
                    'id',
                    $selectedItemIds,
                )
                ->values();

        if (
            $selectedItems->isEmpty()
        ) {
            return redirect()
                ->route(
                    'cart.index',
                )
                ->with(
                    'error',
                    'The selected cart items could not be found.',
                );
        }

        $hasPreorderItems =
            $selectedItems->contains(
                fn (CartItem $item): bool => $item->item_type ===
                    CartItem::TYPE_PREORDER,
            );

        $hasNormalItems =
            $selectedItems->contains(
                fn (CartItem $item): bool => $item->item_type ===
                    CartItem::TYPE_ORDER,
            );

        if (
            $hasPreorderItems
            && $hasNormalItems
        ) {
            return redirect()
                ->route(
                    'cart.index',
                )
                ->with(
                    'error',
                    'Normal merchandise and preorder merchandise cannot be submitted together.',
                );
        }

        $items =
                $selectedItems
                    ->map(
                        function (
                            CartItem $item,
                        ): array {
                            $variant =
                                $item->productVariant;

                            $product =
                                $variant->product;

                            return [
                                'id' => $item->id,

                                'item_type' => $item->item_type,

                                'quantity' => $item->quantity,

                                'unit_price' => $item->unit_price,

                                'line_total' => $item->lineTotal(),

                                'variant' => [
                                    'id' => $variant->id,

                                    'sku' => $variant->sku,

                                    'program' => $variant->program,

                                    'size' => $variant->size,

                                    'variant_name' => $variant
                                        ->variant_name,
                                ],

                                'product' => [
                                    'id' => $product->id,

                                    'code' => $product->code,

                                    'name' => $product->name,

                                    'preorder_early_bird_slots' => $product->preorder_early_bird_slots,

                                    'preorder_early_bird_discount_percent' => $product->preorder_early_bird_discount_percent,

                                    'image_url' => $product->image_path
                                            ? asset(
                                                'storage/'
                                                .$product
                                                    ->image_path,
                                            )
                                            : null,

                                    'category' => [
                                        'id' => $product
                                            ->category
                                            ->id,

                                        'name' => $product
                                            ->category
                                            ->name,
                                    ],
                                ],
                            ];
                        },
                    )
                    ->values();

        return Inertia::render(
            'checkout/Index',
            [
                'student' => [
                    'name' => $user->name,

                    'email' => $user->email,

                    'student_id' => $student
                        ->student_id,

                    'course' => $student
                        ->course,

                    'year_level' => $student
                        ->year_level,
                ],

                'cart' => [
                    'id' => $cart->id,

                    'total_quantity' => $selectedItems->sum(
                        'quantity',
                    ),

                    'subtotal' => number_format(
                        $selectedItems->sum(
                            fn (CartItem $item): float => (float) $item->lineTotal(),
                        ),
                        2,
                        '.',
                        '',
                    ),

                    'items' => $items,
                ],
            ],
        );
    }

    /**
     * Convert the selected cart items into a permanent order.
     *
     * The rules live in CheckoutSubmitter, shared with the mobile app.
     */
    public function store(
        SubmitCheckoutRequest $request,
        CheckoutSubmitter $checkoutSubmitter,
    ): RedirectResponse {
        $result = $checkoutSubmitter->submit(
            $request,
            $request->user(),
            $request->validated('item_ids'),
        );

        return redirect()
            ->route('student.orders.show', $result['order'])
            ->with('success', $result['message']);
    }
}
