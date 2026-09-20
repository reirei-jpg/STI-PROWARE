<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitCheckoutRequest;
use App\Services\CartService;
use App\Services\CheckoutSubmitter;
use Illuminate\Http\JsonResponse;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CheckoutSubmitter $checkoutSubmitter,
        private readonly CartService $cartService,
    ) {}

    /**
     * Turn the selected cart items into an order.
     *
     * Every rule and message (review confirmation, payment reference checks,
     * no mixing of normal and preorder items, stock, cashier notification) is
     * the website's own, through SubmitCheckoutRequest and CheckoutSubmitter.
     */
    public function store(SubmitCheckoutRequest $request): JsonResponse
    {
        $result = $this->checkoutSubmitter->submit(
            $request,
            $request->user(),
            $request->validated('item_ids'),
        );

        $order = $result['order'];

        return response()->json([
            'message' => $result['message'],
            'data' => [
                'order' => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'order_type' => $order->order_type,
                    'payment_method' => $order->payment_method,
                    'payment_status' => $order->payment_status,
                    'total' => $order->total,
                ],
                'cart' => CartController::cartFor($this->cartService, $request),
            ],
        ], 201);
    }
}
