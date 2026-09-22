<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReceiveStockRequest extends FormRequest
{
    /**
     * Allow Super Admin, Admin and Specialist to receive stock.
     */
    public function authorize(): bool
    {
        return in_array(
            $this->user()?->role,
            [
                'super_admin',
                'admin',
                'specialist',
            ],
            true,
        );
    }

    /**
     * Validate the receive-stock form.
     *
     * Every stock receipt must be tied to a purchase order —
     * there is no untraceable "manual" receiving mode.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'purchase_order_id' => [
                'required',
                'integer',
                Rule::exists(
                    'purchase_orders',
                    'id',
                ),
            ],

            'purchase_order_item_id' => [
                'required',
                'integer',
                Rule::exists(
                    'purchase_order_items',
                    'id',
                ),
            ],

            /*
            |--------------------------------------------------------------------------
            | Product Variant
            |--------------------------------------------------------------------------
            |
            | The catalog variant is derived from the selected
            | PurchaseOrderItem, so this is only sent as a
            | substitution safeguard and stays optional here.
            |
            */

            'product_variant_id' => [
                'nullable',
                'integer',
                Rule::exists(
                    'product_variants',
                    'id',
                ),
            ],

            'quantity' => [
                'bail',
                'required',
                'integer',
                'min:1',
                'max:10000',
            ],

            /*
            |--------------------------------------------------------------------------
            | Purchasing Price
            |--------------------------------------------------------------------------
            |
            | Optional. What PROWARE actually paid the supplier for
            | this batch (VAT-inclusive). Used to update the running
            | weighted-average cost for this variant.
            */

            'unit_cost' => [
                'nullable',
                'numeric',
                'min:0',
                'max:10000',
            ],

            'supplier_reference_number' => [
                'nullable',
                'string',
                'max:100',
            ],

            'notes' => [
                'nullable',
                'string',
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
            'purchase_order_id.required' => 'Please select a purchase order.',

            'purchase_order_id.integer' => 'The selected purchase order is invalid.',

            'purchase_order_id.exists' => 'The selected purchase order does not exist.',

            'purchase_order_item_id.required' => 'Please select a purchase order item.',

            'purchase_order_item_id.integer' => 'The selected purchase order item is invalid.',

            'purchase_order_item_id.exists' => 'The selected purchase order item does not exist.',

            'product_variant_id.integer' => 'The selected product variant is invalid.',

            'product_variant_id.exists' => 'The selected product variant does not exist.',

            'quantity.required' => 'Please enter the quantity received.',

            'quantity.integer' => 'The quantity received must be a whole number.',

            'quantity.min' => 'The quantity received must be at least 1.',

            'quantity.max' => 'The quantity received is too large.',

            'unit_cost.numeric' => 'The purchasing price must be a valid amount.',

            'unit_cost.min' => 'The purchasing price cannot be negative.',

            'supplier_reference_number.string' => 'The supplier reference number must be valid text.',

            'supplier_reference_number.max' => 'The supplier reference number must not exceed 100 characters.',

            'notes.string' => 'The notes must be valid text.',

            'notes.max' => 'The notes must not exceed 1,000 characters.',
        ];
    }

    /**
     * Clean and normalize request data before validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'purchase_order_id' => $this->filled(
                'purchase_order_id',
            )
                    ? (int) $this->input(
                        'purchase_order_id',
                    )
                    : null,

            'purchase_order_item_id' => $this->filled(
                'purchase_order_item_id',
            )
                    ? (int) $this->input(
                        'purchase_order_item_id',
                    )
                    : null,

            'product_variant_id' => $this->filled(
                'product_variant_id',
            )
                    ? (int) $this->input(
                        'product_variant_id',
                    )
                    : null,

            'quantity' => $this->filled(
                'quantity',
            )
                    ? (int) $this->input(
                        'quantity',
                    )
                    : null,

            'unit_cost' => $this->filled(
                'unit_cost',
            )
                    ? (float) $this->input(
                        'unit_cost',
                    )
                    : null,

            'supplier_reference_number' => $this->filled(
                'supplier_reference_number',
            )
                    ? trim(
                        (string) $this->input(
                            'supplier_reference_number',
                        ),
                    )
                    : null,

            'notes' => $this->filled(
                'notes',
            )
                    ? trim(
                        (string) $this->input(
                            'notes',
                        ),
                    )
                    : null,
        ]);
    }
}
