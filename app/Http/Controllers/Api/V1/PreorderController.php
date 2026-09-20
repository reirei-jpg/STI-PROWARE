<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Services\StudentOrderPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PreorderController extends Controller
{
    public function __construct(
        private readonly StudentOrderPresenter $presenter,
    ) {}

    /**
     * The signed-in student's preorder items, newest first, the same list as
     * the website's "My Preorders" page.
     */
    public function index(Request $request): JsonResponse
    {
        $studentId = $request->user()->student->id;

        $items = OrderItem::query()
            ->where('item_type', OrderItem::TYPE_PREORDER)
            ->whereHas('order', fn ($query) => $query->where('student_id', $studentId))
            ->with(['order', 'productVariant.product'])
            ->latest()
            ->get();

        return response()->json([
            'data' => $items
                ->map(fn (OrderItem $item): array => $this->presenter->preorderSummary($item))
                ->values(),
        ]);
    }
}
