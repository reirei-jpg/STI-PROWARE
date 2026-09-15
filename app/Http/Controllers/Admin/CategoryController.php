<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
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
    public function index(): Response
    {
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
