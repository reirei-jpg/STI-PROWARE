<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentPreorderController extends Controller
{
    public function index(
        Request $request,
    ): Response {
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

        $preorders =
            OrderItem::query()
                ->where(
                    'item_type',
                    OrderItem::TYPE_PREORDER,
                )
                ->whereHas(
                    'order',
                    function ($query) use ($student): void {
                        $query->where(
                            'student_id',
                            $student->id,
                        );
                    },
                )
                ->with([
                    'order',
                    'productVariant.product',
                ])
                ->latest()
                ->get()
                ->map(
                    function (
                        OrderItem $item,
                    ): array {
                        return [
                            'id' => $item->id,

                            'order_id' => $item->order_id,

                            'order_number' => $item->order
                                ->order_number,

                            'preorder_status' => $item
                                ->preorder_status,

                            'quantity' => $item
                                ->quantity,

                            'unit_price' => $item
                                ->unit_price,

                            'preorder_ready_at' => optional(
                                $item
                                    ->preorder_ready_at,
                            )->format(
                                'M d, Y h:i A',
                            ),

                            'preorder_payment_deadline_at' => optional(
                                $item
                                    ->preorder_payment_deadline_at,
                            )->format(
                                'M d, Y h:i A',
                            ),

                            'product' => [
                            'name' => $item
                                ->productVariant
                                ->product
                                ->name,

                            'code' => $item
                                ->productVariant
                                ->product
                                ->code,

                            'image_url' => $item
                                ->productVariant
                                ->product
                                ->image_path
                                    ? asset(
                                        'storage/'
                                        .$item
                                            ->productVariant
                                            ->product
                                            ->image_path,
                                    )
                                        : null,
                            ],

                            'variant' => [
                                'sku' => $item
                                    ->productVariant
                                    ->sku,

                                'variant_name' => $item
                                    ->productVariant
                                    ->variant_name,
                            ],
                        ];
                    },
                );

        return Inertia::render(
            'student/Preorders/Index',
            [
                'preorders' => $preorders,
            ],
        );
    }
}
