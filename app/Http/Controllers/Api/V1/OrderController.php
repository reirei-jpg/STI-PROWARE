<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderCancellationService;
use App\Services\PreorderPaymentSubmitter;
use App\Services\StudentOrderPresenter;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\SvgWriter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
     * The QR the student shows at the counter, as SVG drawing text the app
     * paints itself. It holds the same token as the website's QR and is only
     * served to the order's owner while a QR is meant to be shown. (SVG, not
     * PNG, because PNG needs PHP's GD extension, which not every server has.)
     */
    public function qr(Request $request, Order $order): JsonResponse
    {
        $this->assertOwnOrder($request, $order);

        $order->loadMissing('items');

        $token = $this->presenter->qrToken($order);

        abort_if($token === null, 404, 'No QR code is available for this order.');

        $result = (new SvgWriter)->write(
            new QrCode(
                data: $token,
                encoding: new Encoding('UTF-8'),
                errorCorrectionLevel: ErrorCorrectionLevel::High,
                size: 320,
                margin: 12,
                roundBlockSizeMode: RoundBlockSizeMode::Margin,
            ),
            options: [
                SvgWriter::WRITER_OPTION_EXCLUDE_XML_DECLARATION => true,
                SvgWriter::WRITER_OPTION_EXCLUDE_SVG_WIDTH_AND_HEIGHT => true,
            ],
        );

        return response()
            ->json(['data' => ['svg' => $result->getString()]])
            ->header('Cache-Control', 'private, no-store');
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
     * Submit the payment method for a preorder whose stock is ready. The
     * fields and messages are the website's own (PaymentMethodValidator and
     * PreorderPaymentSubmitter).
     */
    public function payment(
        Request $request,
        Order $order,
        PreorderPaymentSubmitter $preorderPaymentSubmitter,
    ): JsonResponse {
        $this->assertOwnOrder($request, $order);

        $saved = $preorderPaymentSubmitter->submit($request, $order, $request->user());

        if (! $saved) {
            throw ValidationException::withMessages([
                'order' => PreorderPaymentSubmitter::NOT_AWAITING_MESSAGE,
            ]);
        }

        return response()->json([
            'message' => PreorderPaymentSubmitter::SUCCESS_MESSAGE,
            'data' => $this->presenter->detail($saved->fresh()),
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
