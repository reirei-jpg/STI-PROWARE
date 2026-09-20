<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderCancellationService;
use App\Services\StudentOrderPresenter;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class OrderController extends Controller
{
    public function __construct(
        private readonly StudentOrderPresenter $presenter,
        private readonly OrderCancellationService $cancellation,
    ) {}

    /**
     * The signed-in student's orders, newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->where('student_id', $request->user()->student->id)
            ->with('items.productVariant.product')
            ->latest()
            ->get();

        return response()->json([
            'data' => $orders
                ->map(fn (Order $order): array => $this->presenter->summary($order))
                ->values(),
        ]);
    }

    /**
     * One order with its items, status, QR and cancel information.
     */
    public function show(Request $request, Order $order): JsonResponse
    {
        $this->assertOwnOrder($request, $order);

        return response()->json([
            'data' => $this->presenter->detail($order),
        ]);
    }

    /**
     * The QR the student shows at the counter, as a PNG. It holds the same
     * token as the website's QR, and is only served for the order's owner
     * while a QR is meant to be shown.
     */
    public function qr(Request $request, Order $order): Response
    {
        $this->assertOwnOrder($request, $order);

        $order->loadMissing('items');

        $token = $this->presenter->qrToken($order);

        abort_if($token === null, 404, 'No QR code is available for this order.');

        $result = (new PngWriter)->write(new QrCode(
            data: $token,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: 320,
            margin: 12,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
        ));

        return response($result->getString(), 200, [
            'Content-Type' => $result->getMimeType(),
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    /**
     * Cancel an unpaid order inside the 24-hour window. The rules and their
     * messages are the website's own (OrderCancellationService).
     */
    public function cancel(Request $request, Order $order): JsonResponse
    {
        $this->assertOwnOrder($request, $order);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $this->cancellation->cancelByStudent(
            $request,
            $order,
            $request->user(),
            $validated['note'] ?? null,
        );

        return response()->json([
            'message' => "Order {$order->order_number} has been cancelled.",
            'data' => $this->presenter->detail($order->fresh()),
        ]);
    }

    /**
     * @throws AuthorizationException
     */
    private function assertOwnOrder(Request $request, Order $order): void
    {
        if ($order->student_id !== $request->user()->student?->id) {
            throw new AuthorizationException('You are not allowed to view this order.');
        }
    }
}
