<?php

namespace App\Http\Controllers;

use App\Http\Requests\AddCartItemRequest;
use App\Http\Requests\UpdateCartItemRequest;
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
        abort_unless(
            $request->user()?->role === 'student',
            403,
            'Only students may remove items from this cart.',
        );

        $this->cartService->removeItem(
            $request->user(),
            $cartItem,
        );

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
        UpdateCartItemRequest $request,
        CartItem $cartItem,
    ): RedirectResponse {
        $this->cartService->updateQuantity(
            $request->user(),
            $cartItem,
            $request->integer('quantity'),
        );

        return back()->with(
            'success',
            'Cart quantity updated.',
        );
    }
}
