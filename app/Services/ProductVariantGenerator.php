<?php

namespace App\Services;

use App\Models\Product;
use InvalidArgumentException;

final class ProductVariantGenerator
{
    /**
     * Create all required variants and zero-stock inventory
     * records for a newly created product.
     *
     * @param  array<int, string>  $programs
     * @param  array<int, string>  $sizes
     */
    public function generate(
        Product $product,
        array $programs = [],
        array $sizes = [],
    ): void {
        $definitions = match ($product->variant_mode) {
            Product::VARIANT_MODE_PROGRAM_AND_SIZE => $this->programAndSizeDefinitions(
                $programs,
                $sizes,
            ),

            Product::VARIANT_MODE_SIZE_ONLY => $this->sizeOnlyDefinitions(
                $sizes,
            ),

            Product::VARIANT_MODE_STANDARD => $this->standardDefinitions(),

            default => throw new InvalidArgumentException(
                "Unsupported product variant mode: {$product->variant_mode}",
            ),
        };

        foreach ($definitions as $definition) {
            $variant = $product->variants()->create([
                'sku' => $product->code
                    .'-'
                    .$definition['variant_key'],

                'program' => $definition['program'],

                'size' => $definition['size'],

                'variant_name' => $definition['variant_name'],

                'variant_key' => $definition['variant_key'],

                'price_override' => null,

                'is_active' => true,
            ]);

            $variant->inventory()->create([
                'quantity_on_hand' => 0,
                'quantity_reserved' => 0,
                'reorder_level' => (int) config(
                    'proware.default_reorder_level',
                    5,
                ),
            ]);
        }
    }

    /**
     * Build Program + Size combinations.
     *
     * Example:
     * BSIT + Medium
     * BSTM + Medium
     *
     * @param  array<int, string>  $programs
     * @param  array<int, string>  $sizes
     * @return array<int, array{
     *     program: string|null,
     *     size: string|null,
     *     variant_name: string,
     *     variant_key: string
     * }>
     */
    private function programAndSizeDefinitions(
        array $programs,
        array $sizes,
    ): array {
        $definitions = [];

        foreach ($programs as $program) {
            foreach ($sizes as $size) {
                $sizeCode = $this->sizeCode($size);

                $definitions[] = [
                    'program' => $program,
                    'size' => $size,

                    'variant_name' => "{$program} / {$size}",

                    'variant_key' => "{$program}-{$sizeCode}",
                ];
            }
        }

        return $definitions;
    }

    /**
     * Build variants that use sizes but no program.
     *
     * @param  array<int, string>  $sizes
     * @return array<int, array{
     *     program: string|null,
     *     size: string|null,
     *     variant_name: string,
     *     variant_key: string
     * }>
     */
    private function sizeOnlyDefinitions(
        array $sizes,
    ): array {
        return collect($sizes)
            ->map(
                fn (string $size): array => [
                    'program' => null,
                    'size' => $size,
                    'variant_name' => $size,
                    'variant_key' => $this->sizeCode($size),
                ],
            )
            ->values()
            ->all();
    }

    /**
     * Build the one internal variant used for a product
     * that has no visible program or size.
     *
     * @return array<int, array{
     *     program: string|null,
     *     size: string|null,
     *     variant_name: string,
     *     variant_key: string
     * }>
     */
    private function standardDefinitions(): array
    {
        return [
            [
                'program' => null,
                'size' => null,
                'variant_name' => 'Standard',
                'variant_key' => 'STD',
            ],
        ];
    }

    /**
     * Return the configured SKU code for a size.
     */
    private function sizeCode(
        string $size,
    ): string {
        $configuredSize = collect(
            config('proware.sizes', []),
        )->first(
            fn (array $option): bool => $option['value'] === $size,
        );

        if (! $configuredSize) {
            throw new InvalidArgumentException(
                "No SKU code is configured for size: {$size}",
            );
        }

        return $configuredSize['code'];
    }
}
