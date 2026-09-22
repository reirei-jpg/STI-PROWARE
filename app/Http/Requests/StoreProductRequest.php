<?php

namespace App\Http\Requests;

use App\Models\Product;
use Closure;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    /**
     * Determine whether the current user may create products.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdminLevel()
        ?? false;
    }

    /**
     * Validate the submitted product data.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $allowedPrograms = collect(
            config('proware.programs', []),
        )
            ->pluck('value')
            ->all();

        $allowedSizes = collect(
            config('proware.sizes', []),
        )
            ->pluck('value')
            ->all();

        return [
            'category_id' => [
                'bail',
                'required',
                'integer',

                Rule::exists('categories', 'id')
                    ->where(
                        fn ($query) => $query->where(
                            'is_active',
                            true,
                        ),
                    ),
            ],

            'name' => [
                'bail',
                'required',
                'string',
                'max:150',

                /*
                 * A product name must be unique inside its
                 * selected category, ignoring letter case.
                 */
                function (
                    string $attribute,
                    mixed $value,
                    Closure $fail,
                ): void {
                    $categoryId = $this->integer(
                        'category_id',
                    );

                    /*
                     * Do not query the products table if the
                     * category or name is already unusable.
                     *
                     * Their normal validation rules will show
                     * the appropriate errors.
                     */
                    if (
                        $categoryId <= 0
                        || ! is_string($value)
                        || $value === ''
                    ) {
                        return;
                    }

                    $normalizedName = mb_strtolower(
                        trim($value),
                        'UTF-8',
                    );

                    $duplicateExists = Product::query()
                        ->where(
                            'category_id',
                            $categoryId,
                        )
                        ->whereRaw(
                            'LOWER(name) = ?',
                            [$normalizedName],
                        )
                        ->exists();

                    if ($duplicateExists) {
                        $fail(
                            'A product with this name already exists in the selected category.',
                        );
                    }
                },
            ],

            'description' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'base_price' => [
                'bail',
                'required',
                'numeric',
                'min:0.01',
                'max:99999999.99',
                'decimal:0,2',
            ],

            'variant_mode' => [
                'bail',
                'required',
                'string',

                Rule::in(
                    Product::variantModes(),
                ),
            ],

            /*
             * Programs are required only for products using
             * the program_and_size variant mode.
             */
            'programs' => [
                Rule::excludeIf(
                    fn (): bool => $this->input('variant_mode')
                        !== Product::VARIANT_MODE_PROGRAM_AND_SIZE,
                ),

                'required',
                'array',
                'min:1',
            ],
            'availability_status' => [
                'bail',
                'required',
                'string',
                Rule::in(
                    Product::availabilityStatuses(),
                ),
            ],

            'preorder_enabled' => [
                'required',
                'boolean',
            ],

            'expected_release_date' => [
                Rule::requiredIf(
                    fn (): bool => $this->input('availability_status')
                        === Product::AVAILABILITY_COMING_SOON,
                ),
                'nullable',
                'date',
            ],

            'preorder_starts_at' => [
                Rule::excludeIf(
                    fn (): bool => ! $this->boolean('preorder_enabled'),
                ),
                'nullable',
                'date',
            ],

            'preorder_ends_at' => [
                Rule::excludeIf(
                    fn (): bool => ! $this->boolean('preorder_enabled'),
                ),
                'nullable',
                'date',
                'after:preorder_starts_at',
            ],

            'preorder_limit_per_student' => [
                Rule::excludeIf(
                    fn (): bool => ! $this->boolean('preorder_enabled'),
                ),
                'nullable',
                'integer',
                'min:1',
                'max:1000',
            ],

            'preorder_capacity' => [
                Rule::excludeIf(
                    fn (): bool => ! $this->boolean('preorder_enabled'),
                ),
                'nullable',
                'integer',
                'min:1',
                'max:10000',
            ],
            'programs.*' => [
                'string',
                'distinct',
                Rule::in($allowedPrograms),
            ],

            /*
             * Sizes are required for program_and_size and
             * size_only products.
             *
             * Standard products do not require visible sizes.
             */
            'sizes' => [
                Rule::excludeIf(
                    fn (): bool => ! in_array(
                        $this->input('variant_mode'),
                        [
                            Product::VARIANT_MODE_PROGRAM_AND_SIZE,
                            Product::VARIANT_MODE_SIZE_ONLY,
                        ],
                        true,
                    ),
                ),

                'required',
                'array',
                'min:1',
            ],

            'sizes.*' => [
                'string',
                'distinct',
                Rule::in($allowedSizes),
            ],

            'image' => [
                'nullable',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],

            'is_active' => [
                'required',
                'boolean',
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
            'category_id.required' => 'Please select a product category.',

            'category_id.integer' => 'The selected category is invalid.',

            'category_id.exists' => 'The selected category is invalid or inactive.',

            'name.required' => 'The product name is required.',

            'name.string' => 'The product name must be valid text.',

            'name.max' => 'The product name must not exceed 150 characters.',

            'description.string' => 'The product description must be valid text.',

            'description.max' => 'The description must not exceed 2,000 characters.',

            'base_price.required' => 'The product price is required.',

            'base_price.numeric' => 'The product price must be a valid number.',

            'base_price.min' => 'The product price must be greater than zero.',

            'base_price.max' => 'The product price is too large.',

            'base_price.decimal' => 'The product price may contain up to two decimal places.',

            'variant_mode.required' => 'Please select how this product should be tracked.',

            'variant_mode.in' => 'The selected product tracking mode is invalid.',

            'programs.required' => 'Select at least one college program.',

            'programs.array' => 'The selected programs are invalid.',

            'programs.min' => 'Select at least one college program.',

            'programs.*.distinct' => 'A college program was selected more than once.',

            'programs.*.in' => 'One of the selected college programs is invalid.',

            'sizes.required' => 'Select at least one product size.',

            'sizes.array' => 'The selected sizes are invalid.',

            'sizes.min' => 'Select at least one product size.',

            'sizes.*.distinct' => 'A product size was selected more than once.',

            'sizes.*.in' => 'One of the selected product sizes is invalid.',

            'image.uploaded' => 'PHP rejected the image upload.',

            'image.file' => 'The selected product image could not be uploaded.',

            'image.image' => 'The selected file must be a valid image.',

            'image.mimes' => 'The product image must be JPG, JPEG, PNG, or WEBP.',

            'image.max' => 'The product image must not be larger than 5 MB.',

            'is_active.required' => 'The product status is required.',

            'is_active.boolean' => 'The product status is invalid.',
            'availability_status.required' => 'Please select the product availability status.',

            'availability_status.in' => 'The selected availability status is invalid.',

            'preorder_enabled.required' => 'The preorder setting is required.',

            'preorder_enabled.boolean' => 'The preorder setting is invalid.',

            'expected_release_date.required' => 'Please enter the expected release date for a Coming Soon product.',

            'expected_release_date.date' => 'The expected release date must be a valid date.',

            'preorder_starts_at.date' => 'The preorder start date must be valid.',

            'preorder_ends_at.date' => 'The preorder end date must be valid.',

            'preorder_ends_at.after' => 'The preorder end date must be later than the start date.',

            'preorder_limit_per_student.integer' => 'The per-student preorder limit must be a whole number.',

            'preorder_limit_per_student.min' => 'The per-student preorder limit must be at least 1.',

            'preorder_limit_per_student.max' => 'The per-student preorder limit is too large.',

            'preorder_capacity.integer' => 'The preorder capacity must be a whole number.',

            'preorder_capacity.min' => 'The preorder capacity must be at least 1.',

            'preorder_capacity.max' => 'The preorder capacity is too large.',
        ];
    }

    /**
     * Clean and normalize the submitted values before
     * Laravel applies the validation rules.
     */
    protected function prepareForValidation(): void
    {
        $programs = $this->input(
            'programs',
            [],
        );

        $sizes = $this->input(
            'sizes',
            [],
        );

        $rawName = trim(
            (string) $this->input('name'),
        );

        /*
         * Replace repeated spaces, tabs, and line breaks
         * inside the product name with one normal space.
         *
         * Example:
         *
         * "  STI     College   Uniform  "
         *
         * becomes:
         *
         * "STI College Uniform"
         */
        $normalizedName = preg_replace(
            '/\s+/u',
            ' ',
            $rawName,
        );

        $this->merge([
            'name' => $normalizedName ?? $rawName,

            'description' => $this->filled('description')
                ? trim(
                    (string) $this->input('description'),
                )
                : null,

            'variant_mode' => trim(
                (string) $this->input('variant_mode'),
            ),

            /*
             * Remove empty and duplicated program options.
             */
            'programs' => is_array($programs)
                ? array_values(
                    array_unique(
                        array_filter(
                            array_map(
                                fn ($program): string => trim((string) $program),
                                $programs,
                            ),
                        ),
                    ),
                )
                : [],

            /*
             * Remove empty and duplicated size options.
             */
            'sizes' => is_array($sizes)
                ? array_values(
                    array_unique(
                        array_filter(
                            array_map(
                                fn ($size): string => trim((string) $size),
                                $sizes,
                            ),
                        ),
                    ),
                )
                : [],

            'is_active' => $this->boolean('is_active'),
        ]);
    }

    /**
     * Apply cross-field catalog and preorder rules.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $availabilityStatus = $this->input(
                    'availability_status',
                );

                $preorderEnabled = $this->boolean(
                    'preorder_enabled',
                );

                if (
                    $preorderEnabled
                    && $availabilityStatus
                        !== Product::AVAILABILITY_COMING_SOON
                ) {
                    $validator->errors()->add(
                        'preorder_enabled',
                        'Preorders may only be enabled for Coming Soon products.',
                    );
                }

                $limitPerStudent = $this->input(
                    'preorder_limit_per_student',
                );

                $capacity = $this->input(
                    'preorder_capacity',
                );

                if (
                    $preorderEnabled
                    && is_numeric($limitPerStudent)
                    && is_numeric($capacity)
                    && (int) $limitPerStudent
                        > (int) $capacity
                ) {
                    $validator->errors()->add(
                        'preorder_limit_per_student',
                        'The per-student preorder limit cannot exceed the total preorder capacity.',
                    );
                }
            },
        ];
    }

    /**
     * Preserve the precise PHP upload diagnostics used
     * for troubleshooting failed product-image uploads.
     */
    protected function failedValidation(
        Validator $validator,
    ): void {
        $rawUpload = $_FILES['image'] ?? null;

        if (is_array($rawUpload)) {
            $errorCode = (int) (
                $rawUpload['error']
                ?? UPLOAD_ERR_OK
            );

            if ($errorCode !== UPLOAD_ERR_OK) {
                $message = match ($errorCode) {
                    UPLOAD_ERR_INI_SIZE => 'PHP error 1: The image exceeds upload_max_filesize.',

                    UPLOAD_ERR_FORM_SIZE => 'PHP error 2: The image exceeds the form upload limit.',

                    UPLOAD_ERR_PARTIAL => 'PHP error 3: The image was only partially uploaded.',

                    UPLOAD_ERR_NO_FILE => 'PHP error 4: No image file was received.',

                    UPLOAD_ERR_NO_TMP_DIR => 'PHP error 6: PHP cannot find a temporary upload folder.',

                    UPLOAD_ERR_CANT_WRITE => 'PHP error 7: PHP cannot write the image to its temporary folder.',

                    UPLOAD_ERR_EXTENSION => 'PHP error 8: A PHP extension or security policy stopped the upload.',

                    default => "Unknown PHP upload error code: {$errorCode}.",
                };

                throw new HttpResponseException(
                    back()
                        ->withErrors([
                            'image' => $message,
                        ])
                        ->withInput(),
                );
            }
        }

        parent::failedValidation(
            $validator,
        );
    }
}
