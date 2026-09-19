<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Show categories.
     */
    public function index(
        Request $request,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        $categories =
            Category::query()
                ->orderBy(
                    'name',
                )
                ->get()
                ->map(
                    fn (
                        Category $category,
                    ): array => [
                        'id' => $category->id,

                        'name' => $category->name,

                        'description' => $category->description,

                        'is_active' => (bool)
                            $category->is_active,
                    ],
                )
                ->values();

        return Inertia::render(
            'admin/Categories/Index',
            [
                'categories' => $categories,
            ],
        );
    }

    /**
     * Create category.
     */
    public function store(
        Request $request,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        $validated =
            $request->validate(
                [
                    'name' => [
                        'required',
                        'string',
                        'max:100',
                        Rule::unique(
                            'categories',
                            'name',
                        ),
                    ],

                    'description' => [
                        'nullable',
                        'string',
                        'max:1000',
                    ],
                ],
                [
                    'name.required' => 'Category name is required.',

                    'name.unique' => 'This category already exists.',

                    'name.max' => 'Category name cannot exceed 100 characters.',

                    'description.max' => 'Description cannot exceed 1000 characters.',
                ],
            );

        $category =
            Category::query()
                ->create([
                    'name' => trim(
                        $validated[
                            'name'
                        ],
                    ),

                    'description' => isset(
                        $validated[
                            'description'
                        ],
                    )
                        && trim(
                            $validated[
                                'description'
                            ],
                        ) !== ''
                            ? trim(
                                $validated[
                                    'description'
                                ],
                            )
                            : null,

                    'is_active' => true,
                ]);

        AuditLogger::log(
            request: $request,
            action: 'created',
            module: 'categories',
            description: "Created category {$category->name}.",
            subject: $category,
            newValues: [
                'name' => $category->name,

                'description' => $category->description,

                'is_active' => (bool) $category->is_active,
            ],
        );

        return redirect()
            ->route(
                'admin.categories.index',
            )
            ->with(
                'success',
                'Category created successfully.',
            );
    }

    /**
     * Update category.
     */
    public function update(
        Request $request,
        Category $category,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        $validated =
            $request->validate(
                [
                    'name' => [
                        'required',
                        'string',
                        'max:100',

                        Rule::unique(
                            'categories',
                            'name',
                        )->ignore(
                            $category->id,
                        ),
                    ],

                    'description' => [
                        'nullable',
                        'string',
                        'max:1000',
                    ],

                    'is_active' => [
                        'required',
                        'boolean',
                    ],
                ],
                [
                    'name.required' => 'Category name is required.',

                    'name.unique' => 'This category already exists.',

                    'name.max' => 'Category name cannot exceed 100 characters.',
                ],
            );

        $oldValues =
            $category->only([
                'name',
                'description',
                'is_active',
            ]);

        $category->update([
            'name' => trim(
                $validated[
                    'name'
                ],
            ),

            'description' => isset(
                $validated[
                    'description'
                ],
            )
                && trim(
                    $validated[
                        'description'
                    ],
                ) !== ''
                    ? trim(
                        $validated[
                            'description'
                        ],
                    )
                    : null,

            'is_active' => (bool)
                $validated[
                    'is_active'
                ],
        ]);

        AuditLogger::log(
            request: $request,
            action: 'updated',
            module: 'categories',
            description: "Updated category {$category->name}.",
            subject: $category,
            oldValues: $oldValues,
            newValues: $category->only([
                'name',
                'description',
                'is_active',
            ]),
        );

        return redirect()
            ->route(
                'admin.categories.index',
            )
            ->with(
                'success',
                'Category updated successfully.',
            );
    }
}
