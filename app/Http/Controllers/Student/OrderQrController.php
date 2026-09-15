<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class OrderQrController extends Controller
{
    /**
     * Generate the QR image for a student's order.
     */
    public function show(
        Request $request,
        Order $order,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        $student =
            $user->student;

        abort_unless(
            $student
            && $order->student_id
                === $student->id,
            403,
            'You are not allowed to view this QR code.',
        );

        /*
         * IMPORTANT:
         *
         * The QR no longer points directly to the
         * specialist.
         *
         * It points to one shared scanning endpoint.
         *
         * The server then decides where to send the
         * scanner based on their logged-in role.
         */
        $scanUrl = route(
            'orders.scan',
            [
                'token' => $order->qr_token,
            ],
        );

        $qrCode = new QrCode(
            data: $scanUrl,
            encoding: new Encoding(
                'UTF-8',
            ),
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: 320,
            margin: 12,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
        );

        $writer =
            new PngWriter;

        $result =
            $writer->write(
                $qrCode,
            );

        return response(
            $result->getString(),
            200,
            [
                'Content-Type' => $result
                    ->getMimeType(),

                'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
            ],
        );
    }
}
