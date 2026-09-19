<?php

use App\Models\Order;
use App\Services\OrderCancellationService;
use App\Services\UnpaidOrderExpirationService;
use Illuminate\Validation\ValidationException;

test('a student cancel that loses the race to a payment gets a clear message', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 2);

    // The order was unpaid when the page loaded, but is paid by the time the cancel runs.
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2);

    expect(fn () => app(OrderCancellationService::class)->cancel(
        request(),
        $order,
        $studentUser,
        Order::CANCEL_REASON_STUDENT_REQUEST,
        requireUnpaid: true,
    ))->toThrow(ValidationException::class, 'This order was just paid.');

    expect($order->fresh()->payment_status)->toBe(Order::PAYMENT_PAID)
        ->and($order->fresh()->isCancelled())->toBeFalse();
});

test('one order that fails to cancel does not stop the others from being cancelled', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 4);

    $first = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);
    $second = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);

    Order::query()->whereKey([$first->id, $second->id])->update([
        'created_at' => now()->subHours(60),
    ]);

    $real = app(OrderCancellationService::class);

    $flaky = Mockery::mock(OrderCancellationService::class);
    $flaky->shouldReceive('cancel')
        ->twice()
        ->andReturnUsing(function (...$arguments) use ($real, $first) {
            if ($arguments[1]->id === $first->id) {
                throw new RuntimeException('Simulated failure');
            }

            return $real->cancel(...$arguments);
        });

    $cancelled = (new UnpaidOrderExpirationService($flaky))->cancelOverdue();

    expect($cancelled)->toBe(1)
        ->and($first->fresh()->isCancelled())->toBeFalse()
        ->and($second->fresh()->isCancelled())->toBeTrue();
});
