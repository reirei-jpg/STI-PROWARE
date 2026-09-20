<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\StorefrontCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    /**
     * The student storefront for the mobile app.
     *
     * Same products, statuses and prices as the website Home page, through
     * the shared StorefrontCatalog. The Coming Soon list is sent with the
     * first page only.
     */
    public function index(Request $request, StorefrontCatalog $catalog): JsonResponse
    {
        $products = $catalog->grid($request);

        return response()->json([
            'data' => $products->items(),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
            'coming_soon' => $products->currentPage() === 1
                ? $catalog->comingSoon()
                : [],
            'filters' => $catalog->filterValues(),
        ]);
    }

    /**
     * One product with its variants, for the mobile product page.
     *
     * The same data as the website product page, through StorefrontCatalog.
     */
    public function show(Product $product, StorefrontCatalog $catalog): JsonResponse
    {
        abort_unless($product->isCatalogVisible(), 404);

        return response()->json([
            'data' => $catalog->detail($product),
        ]);
    }
}
