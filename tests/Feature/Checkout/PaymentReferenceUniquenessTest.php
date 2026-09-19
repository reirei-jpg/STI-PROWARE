<?php

use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

function paymentReferenceTestStudent(): Student
{
    $user = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    return Student::query()->create([
        'user_id' => $user->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);
}

function paymentReferenceTestOrder(Student $student, ?string $paymentReference): Order
{
    return Order::query()->create([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $student->user_id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PENDING,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => '100.00',
        'total' => '100.00',
        'qr_token' => Str::random(64),
        'payment_reference' => $paymentReference,
    ]);
}

test('the database rejects two orders sharing the same payment reference', function () {
    $studentA = paymentReferenceTestStudent();
    $studentB = paymentReferenceTestStudent();

    paymentReferenceTestOrder($studentA, 'GCASH-DUPLICATE-REF');

    $threw = false;

    try {
        // A nested transaction (savepoint) so Postgres aborting
        // this statement doesn't also poison the outer test
        // transaction the next assertion needs to run in.
        DB::transaction(
            fn () => paymentReferenceTestOrder($studentB, 'GCASH-DUPLICATE-REF'),
        );
    } catch (QueryException $exception) {
        $threw = true;
    }

    expect($threw)->toBeTrue();

    // Only the first order was actually persisted.
    expect(
        Order::query()->where('payment_reference', 'GCASH-DUPLICATE-REF')->count(),
    )->toBe(1);
});

test('multiple orders with no payment reference yet are allowed', function () {
    $studentA = paymentReferenceTestStudent();
    $studentB = paymentReferenceTestStudent();

    paymentReferenceTestOrder($studentA, null);
    paymentReferenceTestOrder($studentB, null);

    expect(
        Order::query()->whereNull('payment_reference')->count(),
    )->toBe(2);
});
