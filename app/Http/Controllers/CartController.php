<?php

namespace App\Http\Controllers;

use App\Http\Requests\AddCartItemRequest;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Student;
use App\Services\CartService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(
        private readonly CartService $cartService,
    ) {}

    /**
     * Add an item to the shopping cart.
     */
    public function store(
        AddCartItemRequest $request,
    ): RedirectResponse {
        $user = $request->user();

        $variant =
            $request->productVariant();

        $quantity =
            $request->integer(
                'quantity',
            );

        if ($user->role === 'student') {
            $this->cartService
                ->addForStudent(
                    user: $user,
                    variant: $variant,
                    quantity: $quantity,
                );

            return back()->with(
                'success',
                'Product added to your cart.',
            );
        }

        if ($user->role === 'specialist') {
            $student =
                Student::query()
                    ->findOrFail(
                        $request->integer(
                            'student_id',
                        ),
                    );

            $this->cartService
                ->addForSpecialist(
                    specialist: $user,
                    student: $student,
                    variant: $variant,
                    quantity: $quantity,
                );

            return back()->with(
                'success',
                'Product added to the student cart.',
            );
        }

        abort(
            403,
            'You are not authorized to add cart items.',
        );
    }

    /**
     * Remove one item from the logged-in student's
     * active self-service cart.
     */
    public function destroy(
        Request $request,
        CartItem $cartItem,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
            'Only students may remove items from this cart.',
        );

        $cartItem->loadMissing(
            'cart',
        );

        $cart =
            $cartItem->cart;

        abort_unless(
            $cart
            && $cart->created_by === $user->id
            && $cart->source
                === Cart::SOURCE_STUDENT_APP
            && $cart->status
                === Cart::STATUS_ACTIVE,
            403,
            'You are not allowed to remove this cart item.',
        );

        $cartItem->delete();

        return back()->with(
            'success',
            'Item removed from your cart.',
        );
    }

    /**
     * Update the quantity of one item in the logged-in
     * student's active self-service cart.
     */
    public function update(
        Request $request,
        CartItem $cartItem,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
            'Only students may update this cart.',
        );

        $validated = $request->validate([
            'quantity' => [
                'required',
                'integer',
                'min:1',
                'max:99',
            ],
        ], [
            'quantity.required' => 'Please provide the new quantity.',

            'quantity.integer' => 'The quantity must be a whole number.',

            'quantity.min' => 'The quantity must be at least 1.',

            'quantity.max' => 'You may add a maximum of 99 units.',
        ]);

        $cartItem->loadMissing([
            'cart',
            'productVariant.product',
            'productVariant.inventory',
        ]);

        $cart = $cartItem->cart;

        abort_unless(
            $cart
            && $cart->created_by === $user->id
            && $cart->source
                === Cart::SOURCE_STUDENT_APP
            && $cart->status
                === Cart::STATUS_ACTIVE,
            403,
            'You are not allowed to update this cart item.',
        );

        $newQuantity =
            (int) $validated['quantity'];

        $variant =
            $cartItem->productVariant;

        $product =
            $variant->product;

        if (
            $cartItem->item_type
            === CartItem::TYPE_ORDER
        ) {
            $inventory =
                $variant->inventory;

            $availableQuantity =
                $inventory
                    ? $inventory->available_quantity
                    : 0;

            if (
                $newQuantity
                > $availableQuantity
            ) {
                return back()->withErrors([
                    'quantity' => "Only {$availableQuantity} unit(s) are currently available for {$variant->variant_name}.",
                ]);
            }
        }

        if (
            $cartItem->item_type
            === CartItem::TYPE_PREORDER
        ) {
            $limit =
                $product
                    ->preorder_limit_per_student;

            if (
                $limit !== null
                && $newQuantity > $limit
            ) {
                return back()->withErrors([
                    'quantity' => "This product allows a maximum of {$limit} preorder unit(s) per student.",
                ]);
            }
        }

        $cartItem->update([
            'quantity' => $newQuantity,
        ]);

        return back()->with(
            'success',
            'Cart quantity updated.',
        );
    }
}
