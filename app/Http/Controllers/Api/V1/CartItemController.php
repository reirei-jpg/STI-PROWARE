<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddCartItemRequest;
use App\Http\Requests\UpdateCartItemRequest;
use App\Models\CartItem;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartItemController extends Controller
{
    public function __construct(
        private readonly CartService $cartService,
    ) {}

    /**
     * Add a product variant to the signed-in student's cart.
     *
     * Validation and every cart rule (stock, the 99-unit limit, preorder
     * limits) are the website's own: AddCartItemRequest and CartService.
     */
    public function store(AddCartItemRequest $request): JsonResponse
    {
        $cart = $this->cartService->addForStudent(
            user: $request->user(),
            variant: $request->productVariant(),
            quantity: $request->integer('quantity'),
        );

        return response()->json([
            'message' => 'Product added to your cart.',
            'data' => [
                'cart_total_quantity' => $cart->totalQuantity(),
            ],
        ], 201);
    }

    /**
     * Change the quantity of one item, then return the refreshed cart.
     */
    public function update(
        UpdateCartItemRequest $request,
        CartItem $cartItem,
    ): JsonResponse {
        $this->cartService->updateQuantity(
            $request->user(),
            $cartItem,
            $request->integer('quantity'),
        );

        return response()->json([
            'message' => 'Cart quantity updated.',
            'data' => CartController::cartFor($this->cartService, $request),
        ]);
    }

    /**
     * Remove one item, then return the refreshed cart.
     */
    public function destroy(Request $request, CartItem $cartItem): JsonResponse
    {
        $this->cartService->removeItem($request->user(), $cartItem);

        return response()->json([
            'message' => 'Item removed from your cart.',
            'data' => CartController::cartFor($this->cartService, $request),
        ]);
    }
}
