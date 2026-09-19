<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnclaimedOrderController extends Controller
{
    private const PER_PAGE = 20;

    private const DISPLAY_TIMEZONE = 'Asia/Manila';

    /**
     * Paid orders that are ready for pickup but have not been claimed,
     * longest-waiting first, so staff can chase or cancel them.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless(
            $user && in_array($user->role, ['cashier', 'specialist'], true),
            403,
        );

        $isCashier = $user->role === 'cashier';

        $minDays = $request->integer('min_days');

        if (! in_array($minDays, Order::UNCLAIMED_REMINDER_DAYS, true)) {
            $minDays = null;
        }

        $orders = Order::unclaimed()
            ->with('student.user')
            ->withSum('items as total_quantity', 'quantity')
            ->when(
                $minDays,
                fn ($query, int $days) => $query->where(
                    'ready_for_release_at',
                    '<=',
                    now()->subDays($days),
                ),
            )
            ->orderBy('ready_for_release_at')
            ->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Order $order): array => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'student_name' => $order->student?->user?->name ?? 'Unknown Student',
                'student_id' => $order->student?->student_id ?? 'N/A',
                'total' => (string) $order->total,
                'total_quantity' => (int) $order->total_quantity,
                'ready_at' => $order->ready_for_release_at
                    ->timezone(self::DISPLAY_TIMEZONE)
                    ->format('M d, Y h:i A'),
                'days_waiting' => (int) floor(
                    $order->ready_for_release_at->diffInDays(now(), true),
                ),
                'last_reminder_days' => $order->unclaimed_reminder_days,
                'order_url' => $isCashier
                    ? route('cashier.orders.show', $order, false)
                    : route('specialist.orders.show', $order, false),
            ]);

        $summary = ['total' => Order::unclaimed()->count()];

        foreach (Order::UNCLAIMED_REMINDER_DAYS as $days) {
            $summary["over_{$days}"] = Order::unclaimed()
                ->where('ready_for_release_at', '<=', now()->subDays($days))
                ->count();
        }

        return Inertia::render(
            $isCashier
                ? 'cashier/Orders/Unclaimed'
                : 'specialist/Orders/Unclaimed',
            [
                'orders' => $orders,
                'summary' => $summary,
                'filters' => ['min_days' => $minDays],
                'index_url' => $isCashier
                    ? route('cashier.unclaimed.index', absolute: false)
                    : route('specialist.unclaimed.index', absolute: false),
            ],
        );
    }
}
