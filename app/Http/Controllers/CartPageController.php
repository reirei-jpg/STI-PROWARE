<?php

namespace App\Http\Controllers;

use App\Services\CartService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CartPageController extends Controller
{
    public function __construct(
        private readonly CartService $cartService,
    ) {}

    /**
     * Display the logged-in student's active shopping cart.
     */
    public function index(
        Request $request,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user->student,
            403,
            'This account does not have a student profile.',
        );

        return Inertia::render(
            'cart/Index',
            [
                'cart' => $this->cartService->present(
                    $this->cartService->activeStudentCart($user),
                ),
            ],
        );
    }
}
