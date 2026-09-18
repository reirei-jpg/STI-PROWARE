<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentMethodValidator
{
    /**
     * Validate and normalize a submitted payment method +
     * reference, returning the clean values ready to store
     * on an Order.
     *
     * The reference is normalized (trimmed + uppercased) before
     * the uniqueness check runs, so a differently-cased duplicate
     * of an already-used reference cannot slip past validation and
     * then collide with the value that actually gets saved.
     *
     * @return array{payment_method: string, payment_reference: ?string}
     */
    public function validate(Request $request): array
    {
        $paymentMethod =
            $request->input(
                'payment_method',
            );

        $request->merge([
            'payment_reference' => $paymentMethod === 'cash'
                ? null
                : strtoupper(
                    trim(
                        (string) $request->input(
                            'payment_reference',
                        ),
                    ),
                ),
        ]);

        $validated =
            $request->validate(
                [
                    'payment_method' => [
                        'required',
                        'string',

                        Rule::in([
                            'cash',
                            'gcash',
                            'maya',
                        ]),
                    ],

                    'payment_reference' => [
                        Rule::requiredIf(
                            in_array(
                                $paymentMethod,
                                [
                                    'gcash',
                                    'maya',
                                ],
                                true,
                            ),
                        ),

                        'nullable',
                        'string',
                        'min:6',
                        'max:100',

                        Rule::unique(
                            'orders',
                            'payment_reference',
                        ),
                    ],
                ],
                [
                    'payment_method.required' => 'Please select a payment method.',

                    'payment_method.in' => 'The selected payment method is invalid.',

                    'payment_reference.required' => 'The transaction/reference number is required for GCash or Maya.',

                    'payment_reference.min' => 'The transaction/reference number is too short.',

                    'payment_reference.max' => 'The transaction/reference number is too long.',

                    'payment_reference.unique' => 'This transaction/reference number has already been used for another order.',
                ],
            );

        return [
            'payment_method' => $validated['payment_method'],

            'payment_reference' => $validated['payment_reference'] ?? null,
        ];
    }
}
