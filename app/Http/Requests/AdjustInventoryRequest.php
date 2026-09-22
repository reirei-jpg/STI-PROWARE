<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdjustInventoryRequest extends FormRequest
{
    /**
     * Only Admin may perform inventory adjustments.
     *
     * Unlike receiving, an adjustment has no purchase order
     * behind it, so it is deliberately restricted to a
     * narrower audience than stock receiving.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdminLevel() ?? false;
    }

    /**
     * Validate the inventory adjustment form.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'product_variant_id' => [
                'required',
                'integer',
                Rule::exists(
                    'product_variants',
                    'id',
                ),
            ],

            'direction' => [
                'required',
                Rule::in([
                    'increase',
                    'decrease',
                ]),
            ],

            'quantity' => [
                'required',
                'integer',
                'min:1',
                'max:10000',
            ],

            /*
            |--------------------------------------------------------------------------
            | Reason
            |--------------------------------------------------------------------------
            |
            | Unlike a purchase-order receipt, an adjustment has no
            | supplier document behind it. A written reason is the
            | only trail this stock change leaves, so it is
            | mandatory rather than optional notes.
            */

            'reason' => [
                'required',
                'string',
                'min:5',
                'max:1000',
            ],
        ];
    }

    /**
     * Return clear validation messages to the user.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'product_variant_id.required' => 'Please select a product variant.',

            'product_variant_id.exists' => 'The selected product variant does not exist.',

            'direction.required' => 'Please select whether stock is increasing or decreasing.',

            'direction.in' => 'The selected adjustment direction is invalid.',

            'quantity.required' => 'Please enter the adjustment quantity.',

            'quantity.min' => 'The adjustment quantity must be at least 1.',

            'quantity.max' => 'The adjustment quantity is too large.',

            'reason.required' => 'Please explain the reason for this adjustment.',

            'reason.min' => 'The reason must be at least 5 characters.',

            'reason.max' => 'The reason must not exceed 1,000 characters.',
        ];
    }

    /**
     * Clean and normalize request data before validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'product_variant_id' => $this->filled('product_variant_id')
                    ? (int) $this->input('product_variant_id')
                    : null,

            'quantity' => $this->filled('quantity')
                    ? (int) $this->input('quantity')
                    : null,

            'reason' => $this->filled('reason')
                    ? trim((string) $this->input('reason'))
                    : null,
        ]);
    }
}
