<?php

namespace App\Filters;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ProductFilters
{
    public function __construct(
        private readonly Request $request,
    ) {}

    /**
     * Apply all supported product-list filters.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    public function apply(
        Builder $query,
    ): Builder {
        return $query
            ->when(
                $this->search(),
                fn (
                    Builder $query,
                    string $search,
                ): Builder => $this->applySearch(
                    $query,
                    $search,
                ),
            )
            ->when(
                $this->availabilityStatus(),
                fn (
                    Builder $query,
                    string $status,
                ): Builder => $query->where(
                    'availability_status',
                    $status,
                ),
            );
    }

    /**
     * Return the cleaned search value.
     */
    public function search(): ?string
    {
        $search = trim(
            (string) $this->request->query(
                'search',
                '',
            ),
        );

        return $search !== ''
            ? $search
            : null;
    }

    /**
     * Return a valid availability filter.
     */
    public function availabilityStatus(): ?string
    {
        $status = trim(
            (string) $this->request->query(
                'status',
                '',
            ),
        );

        if (
            ! in_array(
                $status,
                Product::availabilityStatuses(),
                true,
            )
        ) {
            return null;
        }

        return $status;
    }

    /**
     * Values returned to the React page so the current
     * search and status remain visible in the interface.
     *
     * @return array{
     *     search: string,
     *     status: string
     * }
     */
    public function values(): array
    {
        return [
            'search' => $this->search() ?? '',

            'status' => $this->availabilityStatus()
                ?? '',
        ];
    }

    /**
     * Search by product code, product name, or category.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    private function applySearch(
        Builder $query,
        string $search,
    ): Builder {
        $normalizedSearch = mb_strtolower(
            $search,
            'UTF-8',
        );

        $likeSearch =
            "%{$normalizedSearch}%";

        return $query->where(
            function (
                Builder $query,
            ) use (
                $likeSearch,
            ): void {
                $query
                    ->whereRaw(
                        'LOWER(code) LIKE ?',
                        [$likeSearch],
                    )
                    ->orWhereRaw(
                        'LOWER(name) LIKE ?',
                        [$likeSearch],
                    )
                    ->orWhereHas(
                        'category',
                        fn (
                            Builder $categoryQuery,
                        ) => $categoryQuery
                            ->whereRaw(
                                'LOWER(name) LIKE ?',
                                [$likeSearch],
                            ),
                    );
            },
        );
    }
}
