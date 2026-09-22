<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateProductRequest extends FormRequest
{
    /**
     * Determine whether the authenticated user
     * may update products.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdminLevel()
            ?? false;
    }

    /**
     * Get the validation rules.
     */
    public function rules(): array
    {
        return [
            'category_id' => [
                'required',
                'integer',
                'exists:categories,id',
            ],

            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'base_price' => [
                'required',
                'numeric',
                'min:0.01',
                'max:99999999.99',
                'decimal:0,2',
            ],

            'availability_status' => [
                'required',
                Rule::in([
                    Product::AVAILABILITY_AVAILABLE,
                    Product::AVAILABILITY_COMING_SOON,
                    Product::AVAILABILITY_OUT_OF_STOCK,
                    Product::AVAILABILITY_INACTIVE,
                ]),
            ],

            'preorder_enabled' => [
                'required',
                'boolean',
            ],

            'expected_release_date' => [
                'nullable',
                'date',
            ],

            'preorder_starts_at' => [
                'nullable',
                'date',
            ],

            'preorder_ends_at' => [
                'nullable',
                'date',
                'after:preorder_starts_at',
            ],

            'preorder_limit_per_student' => [
                'nullable',
                'integer',
                'min:1',
                'max:1000',
            ],

            'preorder_capacity' => [
                'nullable',
                'integer',
                'min:1',
                'max:10000',
            ],

            'image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            'remove_image' => [
                'nullable',
                'boolean',
            ],

            'is_active' => [
                'required',
                'boolean',
            ],
        ];
    }

    /**
     * Additional validation after the normal rules.
     */
    public function after(): array
    {
        return [
            function (
                Validator $validator,
            ): void {
                $availabilityStatus =
                    $this->input(
                        'availability_status',
                    );

                $preorderEnabled =
                    $this->boolean(
                        'preorder_enabled',
                    );

                /*
                |--------------------------------------------------------------------------
                | Preorders Only For Coming Soon
                |--------------------------------------------------------------------------
                */

                if (
                    $preorderEnabled
                    &&
                    $availabilityStatus
                    !==
                    Product::AVAILABILITY_COMING_SOON
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'preorder_enabled',
                            'Preorders can only be enabled for Coming Soon products.',
                        );
                }

                /*
                |--------------------------------------------------------------------------
                | Coming Soon Requires Release Date
                |--------------------------------------------------------------------------
                */

                if (
                    $availabilityStatus
                    ===
                    Product::AVAILABILITY_COMING_SOON
                    &&
                    ! $this->filled(
                        'expected_release_date',
                    )
                ) {
                    $validator
                        ->errors()
                        ->add(
                            'expected_release_date',
                            'An expected release date is required for Coming Soon products.',
                        );
                }

                /*
                |--------------------------------------------------------------------------
                | Preorder Configuration
                |--------------------------------------------------------------------------
                */

                if (
                    $preorderEnabled
                ) {
                    if (
                        ! $this->filled(
                            'preorder_starts_at',
                        )
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                'preorder_starts_at',
                                'The preorder start date and time is required.',
                            );
                    }

                    if (
                        ! $this->filled(
                            'preorder_ends_at',
                        )
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                'preorder_ends_at',
                                'The preorder end date and time is required.',
                            );
                    }

                    if (
                        ! $this->filled(
                            'preorder_limit_per_student',
                        )
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                'preorder_limit_per_student',
                                'Set the maximum preorder quantity per student.',
                            );
                    }

                    if (
                        ! $this->filled(
                            'preorder_capacity',
                        )
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                'preorder_capacity',
                                'Set the total preorder capacity.',
                            );
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Per-Student Limit Cannot Exceed Capacity
                    |--------------------------------------------------------------------------
                    */

                    $limitPerStudent = $this->input(
                        'preorder_limit_per_student',
                    );

                    $capacity = $this->input(
                        'preorder_capacity',
                    );

                    if (
                        is_numeric($limitPerStudent)
                        && is_numeric($capacity)
                        && (int) $limitPerStudent
                            > (int) $capacity
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                'preorder_limit_per_student',
                                'The per-student preorder limit cannot exceed the total preorder capacity.',
                            );
                    }
                }
            },
        ];
    }

    /**
     * Normalize boolean values before validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'preorder_enabled' => $this->boolean(
                'preorder_enabled',
            ),

            'remove_image' => $this->boolean(
                'remove_image',
            ),

            'is_active' => $this->boolean(
                'is_active',
            ),
        ]);
    }
}
