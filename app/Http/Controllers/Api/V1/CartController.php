<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(
        private readonly CartService $cartService,
    ) {}

    /**
     * The signed-in student's cart. A student who has not added anything yet
     * gets an empty cart rather than nothing, so the app has one shape to show.
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => self::cartFor($this->cartService, $request),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function cartFor(CartService $cartService, Request $request): array
    {
        return $cartService->present(
            $cartService->activeStudentCart($request->user()),
        ) ?? [
            'id' => null,
            'status' => Cart::STATUS_ACTIVE,
            'source' => Cart::SOURCE_STUDENT_APP,
            'total_quantity' => 0,
            'subtotal' => '0.00',
            'items' => [],
        ];
    }
}
