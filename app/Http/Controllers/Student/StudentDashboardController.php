<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Services\StorefrontCatalog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentDashboardController extends Controller
{
    /**
     * Display the Student Home storefront.
     *
     * Which products appear, and how each card is described, lives in
     * StorefrontCatalog so the mobile app shows exactly the same thing.
     */
    public function __invoke(
        Request $request,
        StorefrontCatalog $catalog,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        return Inertia::render(
            'student/Dashboard',
            [
                'homeProducts' => $catalog->grid($request),

                'comingSoonProducts' => $catalog->comingSoon(),

                'filters' => $catalog->filterValues(),
            ],
        );
    }
}
