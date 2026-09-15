<?php

namespace App\Http\Requests;

use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddCartItemRequest extends FormRequest
{
    /**
     * Only students and specialists may add cart items.
     */
    public function authorize(): bool
    {
        return in_array(
            $this->user()?->role,
            [
                'student',
                'specialist',
            ],
            true,
        );
    }

    /**
     * Validate the selected variant and requested quantity.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'product_variant_id' => [
                'bail',
                'required',
                'integer',

                Rule::exists(
                    'product_variants',
                    'id',
                )->where(
                    fn ($query) => $query->where(
                        'is_active',
                        true,
                    ),
                ),
            ],

            'quantity' => [
                'bail',
                'required',
                'integer',
                'min:1',
                'max:99',
            ],

            /*
             * Required only when a specialist is creating
             * an assisted cart for a student.
             */
            'student_id' => [
                Rule::requiredIf(
                    fn (): bool => $this->user()?->role
                        === 'specialist',
                ),

                Rule::excludeIf(
                    fn (): bool => $this->user()?->role
                        !== 'specialist',
                ),

                'integer',

                Rule::exists(
                    'students',
                    'id',
                ),
            ],
        ];
    }

    /**
     * Return user-friendly validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'product_variant_id.required' => 'Please select a product variant.',

            'product_variant_id.integer' => 'The selected product variant is invalid.',

            'product_variant_id.exists' => 'The selected product variant is invalid or inactive.',

            'quantity.required' => 'Please enter the quantity.',

            'quantity.integer' => 'The quantity must be a whole number.',

            'quantity.min' => 'The quantity must be at least 1.',

            'quantity.max' => 'You may add a maximum of 99 units.',

            'student_id.required' => 'Please select the student receiving this merchandise.',

            'student_id.integer' => 'The selected student is invalid.',

            'student_id.exists' => 'The selected student could not be found.',
        ];
    }

    /**
     * Normalize submitted values before validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
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

            'student_id' => $this->filled(
                'student_id',
            )
                    ? (int) $this->input(
                        'student_id',
                    )
                    : null,
        ]);
    }

    /**
     * Return the validated product variant.
     */
    public function productVariant(): ProductVariant
    {
        return ProductVariant::query()
            ->findOrFail(
                $this->integer(
                    'product_variant_id',
                ),
            );
    }
}
