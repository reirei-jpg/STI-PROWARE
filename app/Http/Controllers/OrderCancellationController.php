<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OrderCancellationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderCancellationController extends Controller
{
    public function __construct(
        private readonly OrderCancellationService $cancellation,
    ) {}

    /**
     * A student cancels their own unpaid order, inside the time limit.
     */
    public function student(
        Request $request,
        Order $order,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user && $user->role === 'student',
            403,
        );

        abort_unless(
            $user->student
                && $order->student_id === $user->student->id,
            403,
            'You are not allowed to cancel this order.',
        );

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $order->load('items');

        $blockedReason = $order->studentCancelBlockedReason();

        if ($blockedReason !== null) {
            throw ValidationException::withMessages([
                'order' => $blockedReason,
            ]);
        }

        $this->cancellation->cancel(
            request: $request,
            order: $order,
            actor: $user,
            reason: Order::CANCEL_REASON_STUDENT_REQUEST,
            note: $validated['note'] ?? null,
            requireUnpaid: true,
        );

        return redirect()
            ->route('student.orders.show', $order)
            ->with('success', "Order {$order->order_number} has been cancelled.");
    }

    /**
     * A cashier or admin cancels any order that has not been released,
     * with no time limit. A paid order also needs the refund confirmed.
     */
    public function staff(
        Request $request,
        Order $order,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user && in_array($user->role, ['cashier', 'admin', 'super_admin'], true),
            403,
        );

        $validated = $request->validate([
            'reason' => [
                'required',
                Rule::in(Order::CANCEL_REASONS_SELECTABLE),
            ],
            'note' => [
                Rule::requiredIf(
                    $request->input('reason') === Order::CANCEL_REASON_OTHER,
                ),
                'nullable',
                'string',
                'max:500',
            ],
            'refund_confirmed' => ['nullable', 'boolean'],
        ]);

        $this->cancellation->cancel(
            request: $request,
            order: $order,
            actor: $user,
            reason: $validated['reason'],
            note: $validated['note'] ?? null,
            refundConfirmed: (bool) ($validated['refund_confirmed'] ?? false),
        );

        return back()->with(
            'success',
            "Order {$order->order_number} has been cancelled.",
        );
    }
}
