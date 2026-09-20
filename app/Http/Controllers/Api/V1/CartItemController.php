<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddCartItemRequest;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;

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
}
