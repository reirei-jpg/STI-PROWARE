<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CartPageController extends Controller
{
    /**
     * Display the logged-in student's active shopping cart.
     */
    public function index(
        Request $request,
    ): Response {
        $user = $request->user();

        $student = $user->student;

        abort_unless(
            $student,
            403,
            'This account does not have a student profile.',
        );

        $cart = Cart::query()
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
                'items' => function ($query): void {
                    $query
                        ->latest()
                        ->with([
                            'productVariant.product.category:id,name',
                        ]);
                },
            ])
            ->first();

        $items = $cart
            ? $cart->items
                ->map(
                    function (CartItem $item): array {
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

                                'variant_name' => $variant->variant_name,
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
                                            .$product->image_path,
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
                ->values()
            : collect();

        return Inertia::render(
            'cart/Index',
            [
                'cart' => $cart
                    ? [
                        'id' => $cart->id,

                        'status' => $cart->status,

                        'source' => $cart->source,

                        'total_quantity' => $cart->totalQuantity(),

                        'subtotal' => $cart->subtotal(),

                        'items' => $items,
                    ]
                    : null,
            ],
        );
    }
}
