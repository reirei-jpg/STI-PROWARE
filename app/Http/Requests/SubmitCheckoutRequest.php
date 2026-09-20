<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitCheckoutRequest extends FormRequest
{
    /**
     * Only students check out their own cart.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'student';
    }

    /**
     * The payment method and reference are validated afterwards by
     * PaymentMethodValidator, because a preorder-only checkout has none.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'confirmed' => ['accepted'],

            'item_ids' => ['required', 'array', 'min:1'],

            'item_ids.*' => ['required', 'integer', 'distinct', 'exists:cart_items,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'confirmed.accepted' => 'Please confirm that you reviewed your order before submitting it.',
            'item_ids.required' => 'Please select at least one cart item.',
            'item_ids.min' => 'Please select at least one cart item.',
        ];
    }
}
