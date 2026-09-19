<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Notification;
use App\Services\CheckoutService;
use App\Services\NotificationService;
use App\Services\PaymentMethodValidator;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CheckoutService $checkoutService,
        private readonly PaymentMethodValidator $paymentMethodValidator,
    ) {}

    /**
     * Show the final checkout review page.
     */
    public function index(
        Request $request,
    ): Response|RedirectResponse {
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

        $cart =
            Cart::query()
                ->where(
                    'student_id',
                    $student->id,
                )
                ->where(
                    'created_by',
                    $user->id,
                )
                ->where(
                    'source',
                    Cart::SOURCE_STUDENT_APP,
                )
                ->where(
                    'status',
                    Cart::STATUS_ACTIVE,
                )
                ->with([
                    'items' => function (
                        $query,
                    ): void {
                        $query
                            ->with([
                                'productVariant.product.category:id,name',
                            ])
                            ->latest();
                    },
                ])
                ->first();

        if (
            ! $cart
            || $cart->items->isEmpty()
        ) {
            return redirect()
                ->route(
                    'cart.index',
                )
                ->with(
                    'error',
                    'Your cart is empty.',
                );
        }

        $selectedItemIds =
    collect(
        explode(
            ',',
            (string) $request->query(
                'items',
                '',
            ),
        ),
    )
        ->filter()
        ->map(
            fn ($id) => (int) $id,
        )
        ->values();

        if (
            $selectedItemIds->isEmpty()
        ) {
            return redirect()
                ->route(
                    'cart.index',
                )
                ->with(
                    'error',
                    'Please select at least one cart item.',
                );
        }

        $selectedItems =
            $cart->items
                ->whereIn(
                    'id',
                    $selectedItemIds,
                )
                ->values();

        if (
            $selectedItems->isEmpty()
        ) {
            return redirect()
                ->route(
                    'cart.index',
                )
                ->with(
                    'error',
                    'The selected cart items could not be found.',
                );
        }

        $hasPreorderItems =
            $selectedItems->contains(
                fn (CartItem $item): bool => $item->item_type ===
                    CartItem::TYPE_PREORDER,
            );

        $hasNormalItems =
            $selectedItems->contains(
                fn (CartItem $item): bool => $item->item_type ===
                    CartItem::TYPE_ORDER,
            );

        if (
            $hasPreorderItems
            && $hasNormalItems
        ) {
            return redirect()
                ->route(
                    'cart.index',
                )
                ->with(
                    'error',
                    'Normal merchandise and preorder merchandise cannot be submitted together.',
                );
        }

        $items =
                $selectedItems
                    ->map(
                        function (
                            CartItem $item,
                        ): array {
                            $variant =
                                $item->productVariant;

                            $product =
                                $variant->product;

                            return [
                                'id' => $item->id,

                                'item_type' => $item->item_type,

                                'quantity' => $item->quantity,

                                'unit_price' => $item->unit_price,

                                'line_total' => $item->lineTotal(),

                                'variant' => [
                                    'id' => $variant->id,

                                    'sku' => $variant->sku,

                                    'program' => $variant->program,

                                    'size' => $variant->size,

                                    'variant_name' => $variant
                                        ->variant_name,
                                ],

                                'product' => [
                                    'id' => $product->id,

                                    'code' => $product->code,

                                    'name' => $product->name,

                                    'preorder_early_bird_slots' => $product->preorder_early_bird_slots,

                                    'preorder_early_bird_discount_percent' => $product->preorder_early_bird_discount_percent,

                                    'image_url' => $product->image_path
                                            ? asset(
                                                'storage/'
                                                .$product
                                                    ->image_path,
                                            )
                                            : null,

                                    'category' => [
                                        'id' => $product
                                            ->category
                                            ->id,

                                        'name' => $product
                                            ->category
                                            ->name,
                                    ],
                                ],
                            ];
                        },
                    )
                    ->values();

        return Inertia::render(
            'checkout/Index',
            [
                'student' => [
                    'name' => $user->name,

                    'email' => $user->email,

                    'student_id' => $student
                        ->student_id,

                    'course' => $student
                        ->course,

                    'year_level' => $student
                        ->year_level,
                ],

                'cart' => [
                    'id' => $cart->id,

                    'total_quantity' => $selectedItems->sum(
                        'quantity',
                    ),

                    'subtotal' => number_format(
                        $selectedItems->sum(
                            fn (CartItem $item): float => (float) $item->lineTotal(),
                        ),
                        2,
                        '.',
                        '',
                    ),

                    'items' => $items,
                ],
            ],
        );
    }

    /**
     * Convert the active cart
     * into a permanent order.
     */
    public function store(
        Request $request,
        NotificationService $notificationService,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Validate Checkout + Payment Method
        |--------------------------------------------------------------------------
        */

        $validated =
            $request->validate(
                [
                    'confirmed' => [
                        'accepted',
                    ],

                    'item_ids' => [
                        'required',
                        'array',
                        'min:1',
                    ],

                    'item_ids.*' => [
                        'required',
                        'integer',
                        'distinct',
                        'exists:cart_items,id',
                    ],
                ],
                [
                    'confirmed.accepted' => 'Please confirm that you reviewed your order before submitting it.',

                    'item_ids.required' => 'Please select at least one cart item.',

                    'item_ids.min' => 'Please select at least one cart item.',
                ],
            );

        /*
        |--------------------------------------------------------------------------
        | Determine Selected Checkout Type
        |--------------------------------------------------------------------------
        */

        $selectedItems =
            CartItem::query()
                ->whereIn(
                    'id',
                    $validated['item_ids'],
                )
                ->get();

        $hasPreorderItems =
            $selectedItems->contains(
                fn (CartItem $item): bool => $item->item_type ===
                    CartItem::TYPE_PREORDER,
            );

        $hasNormalItems =
            $selectedItems->contains(
                fn (CartItem $item): bool => $item->item_type ===
                    CartItem::TYPE_ORDER,
            );

        if (
            $hasPreorderItems
            && $hasNormalItems
        ) {
            return back()
                ->withErrors([
                    'checkout' => 'Normal merchandise and preorder merchandise cannot be submitted together.',
                ]);
        }

        $isPreorderOnly =
            $hasPreorderItems
            && ! $hasNormalItems;

        /*
        |--------------------------------------------------------------------------
        | Validate + Normalize Payment Information
        |--------------------------------------------------------------------------
        */

        $paymentMethod = null;
        $paymentReference = null;

        if (! $isPreorderOnly) {
            $payment =
                $this
                    ->paymentMethodValidator
                    ->validate(
                        $request,
                    );

            $paymentMethod =
                $payment[
                    'payment_method'
                ];

            $paymentReference =
                $payment[
                    'payment_reference'
                ];
        }

        /*
        |--------------------------------------------------------------------------
        | Existing Checkout Service
        |--------------------------------------------------------------------------
        |
        | KEEP your working CheckoutService
        | untouched.
        |
        | It still handles:
        |
        | - cart validation
        | - stock
        | - preorder logic
        | - order creation
        | - order items
        | - reservations
        |
        */

        /*
        |--------------------------------------------------------------------------
        | Checkout + Payment Save, One Transaction
        |--------------------------------------------------------------------------
        |
        | The payment_reference uniqueness check above runs before
        | any row exists, so two concurrent checkouts submitting the
        | same reference can both pass it and both reach this save()
        | — the database's own unique index (not the check above) is
        | what actually prevents the duplicate. Wrapping the order
        | creation and the payment save in one transaction means a
        | rejected duplicate reference rolls back the whole order —
        | including the items, stock reservations, and cart changes
        | CheckoutService already made — instead of leaving behind an
        | order with no valid payment info attached.
        */

        try {
            $order =
                DB::transaction(
                    function () use (
                        $user,
                        $validated,
                        $isPreorderOnly,
                        $paymentMethod,
                        $paymentReference,
                    ) {
                        $order =
                            $this
                                ->checkoutService
                                ->checkoutForStudent(
                                    $user,
                                    $validated['item_ids'],
                                );

                        if (! $isPreorderOnly) {
                            $order->forceFill([
                                'payment_method' => $paymentMethod,

                                'payment_reference' => $paymentReference,
                            ])->save();
                        }

                        return $order;
                    },
                );
        } catch (QueryException $exception) {
            if (
                str_contains(
                    $exception->getMessage(),
                    'orders_payment_reference_unique',
                )
            ) {
                return back()
                    ->withErrors([
                        'payment_reference' => 'This payment reference has already been used for another order. Please check your transaction and try again.',
                    ])
                    ->withInput();
            }

            throw $exception;
        }

        /*
        |--------------------------------------------------------------------------
        | Notify Cashiers Of New Payment
        |--------------------------------------------------------------------------
        |
        | The order is still PENDING PAYMENT.
        |
        | Cashier will later verify/confirm it.
        |
        */

        if (! $isPreorderOnly) {

            /*
            |--------------------------------------------------------------------------
            | Notify Cashiers
            |--------------------------------------------------------------------------
            |
            | A preorder-only order has no payment method yet and
            | is not awaiting cashier verification, so cashiers are
            | notified only once a real payment method is attached.
            |
            */

            $notificationService->cashiers(
                type: Notification::TYPE_ORDER_PENDING_PAYMENT,

                title: 'New Order Awaiting Payment',

                message: "{$user->name} placed order {$order->order_number} "
                    .'using '
                    .strtoupper($paymentMethod)
                    .'. Verify and confirm payment when ready.',

                link: "/cashier/orders/{$order->id}",

                data: [
                    'order_id' => $order->id,

                    'order_number' => $order->order_number,

                    'payment_method' => $order->payment_method,

                    'total' => $order->total,
                ],
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Open Created Order
        |--------------------------------------------------------------------------
        */

        $isPreorder =
             $order->items()
                 ->where(
                     'item_type',
                     CartItem::TYPE_PREORDER,
                 )
                 ->exists();

        $successMessage =
            $isPreorder
                ? 'Your preorder has been submitted successfully. No payment is required yet. You will be notified when stock becomes available and your preorder is ready for payment.'
                : (
                    $paymentMethod === 'cash'
                        ? 'Your order has been placed successfully. Show your Payment QR to the cashier and pay in cash.'
                        : 'Your order has been placed successfully. Your online payment reference was recorded and is waiting for cashier verification.'
                );

        return redirect()
            ->route(
                'student.orders.show',
                $order,
            )
            ->with(
                'success',
                $successMessage,
            );
    }
}
