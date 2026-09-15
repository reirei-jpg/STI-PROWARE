import {
    FormEvent,
    useState,
} from 'react';

import {
    Head,
    router,
    useForm,
    usePage,
} from '@inertiajs/react';

import {
    CheckCircle2,
    FolderPlus,
    LoaderCircle,
    Pencil,
    Power,
    Tags,
    X,
} from 'lucide-react';

import AdminLayout from '@/layouts/AdminLayout';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';

interface Category {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
}

interface Props {
    categories: Category[];
}

interface SharedPageProps {
    [key: string]: unknown;

    flash?: {
        success?: string | null;
        error?: string | null;
    };
}

export default function Index({
    categories,
}: Props) {
    const page =
        usePage<SharedPageProps>();

    const flash =
        page.props.flash;

    const [
        editingCategory,
        setEditingCategory,
    ] = useState<Category | null>(
        null,
    );

    const [
    showEditConfirm,
    setShowEditConfirm,
] = useState(false);

const [
    statusCategory,
    setStatusCategory,
] = useState<Category | null>(null);

const [
    processingCategoryId,
    setProcessingCategoryId,
] = useState<number | null>(null);

    const createForm =
        useForm({
            name: '',
            description: '',
        });

const [
    showCreateConfirm,
    setShowCreateConfirm,
] = useState(false);

const {
    notification,
    showSuccess,
    showError,
    clearNotification,
} = useActionFeedback();

    const editForm =
        useForm({
            name: '',
            description: '',
            is_active: true,
        });

    const submitCreate = (
            event: FormEvent,
        ) => {
            event.preventDefault();

            if (
                createForm.processing ||
                !createForm.data.name.trim()
            ) {
                return;
            }

            createForm.clearErrors();

            setShowCreateConfirm(true);
        };

        const confirmCreateCategory = (): void => {
                if (
                    createForm.processing ||
                    !createForm.data.name.trim()
                ) {
                    return;
                }

                createForm.post(
                    '/admin/categories',
                    {
                        preserveScroll: true,

                        onSuccess: () => {
                            setShowCreateConfirm(false);

                            createForm.reset();

                            showSuccess(
                                'Category created successfully.',
                            );
                        },

                        onError: (errors) => {
                            setShowCreateConfirm(false);

                            const firstError =
                                Object.values(errors)[0];

                            if (
                                typeof firstError ===
                                'string'
                            ) {
                                showError(firstError);
                                return;
                            }

                            showError(
                                'Category could not be created. Please check the form and try again.',
                            );
                        },
                    },
                );
            };
    const startEdit = (
        category: Category,
    ) => {
        setEditingCategory(
            category,
        );

        editForm.clearErrors();

        editForm.setData({
            name:
                category.name,

            description:
                category.description
                ?? '',

            is_active:
                category.is_active,
        });
    };

    const closeEdit = () => {
        setEditingCategory(
            null,
        );

        editForm.reset();

        editForm.clearErrors();
    };

    const submitEdit = (
            event: FormEvent,
        ) => {
            event.preventDefault();

            if (
                !editingCategory ||
                editForm.processing ||
                !editForm.data.name.trim()
            ) {
                return;
            }

            editForm.clearErrors();

            setShowEditConfirm(true);
        };


        const confirmEditCategory = (): void => {
            if (
                !editingCategory ||
                editForm.processing ||
                !editForm.data.name.trim()
            ) {
                return;
            }

            editForm.put(
                `/admin/categories/${editingCategory.id}`,
                {
                    preserveScroll: true,

                    onSuccess: () => {
                        setShowEditConfirm(false);

                        showSuccess(
                            'Category updated successfully.',
                        );

                        closeEdit();
                    },

                    onError: (errors) => {
                        setShowEditConfirm(false);

                        const firstError =
                            Object.values(errors)[0];

                        if (
                            typeof firstError ===
                            'string'
                        ) {
                            showError(firstError);
                            return;
                        }

                        showError(
                            'Category could not be updated. Please check the form and try again.',
                        );
                    },
                },
            );
        };

    const toggleStatus = (
        category: Category,
    ): void => {
        if (
            processingCategoryId !== null
        ) {
            return;
        }

        setStatusCategory(category);
    };

        const confirmToggleStatus = (): void => {
            if (
                !statusCategory ||
                processingCategoryId !== null
            ) {
                return;
            }

            const category = statusCategory;
            const willActivate = !category.is_active;

            setProcessingCategoryId(category.id);

            router.put(
                `/admin/categories/${category.id}`,
                {
                    name: category.name,

                    description:
                        category.description
                        ?? '',

                    is_active:
                        willActivate,
                },
                {
                    preserveScroll: true,

                    onSuccess: () => {
                        setStatusCategory(null);

                        showSuccess(
                            `Category ${
                                willActivate
                                    ? 'activated'
                                    : 'deactivated'
                            } successfully.`,
                        );
                    },

                    onError: () => {
                        setStatusCategory(null);

                        showError(
                            `Category could not be ${
                                willActivate
                                    ? 'activated'
                                    : 'deactivated'
                            }. Please try again.`,
                        );
                    },

                    onFinish: () => {
                        setProcessingCategoryId(null);
                    },
                },
            );
        };

    return (
        <AdminLayout>
            <Head title="Categories" />

            <div className="space-y-7">
                {/* HEADER */}
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                        STI PROWARE
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        Merchandise Categories
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Create and manage the categories used to organize PROWARE merchandise.
                    </p>
                </div>

                {/* FLASH */}
                {flash?.success && (
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
                        <CheckCircle2
                            size={18}
                        />

                        {
                            flash.success
                        }
                    </div>
                )}

                {flash?.error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                        {
                            flash.error
                        }
                    </div>
                )}

                <div className="grid gap-7 xl:grid-cols-[360px_minmax(0,1fr)]">
                    {/* CREATE */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <FolderPlus
                                    size={21}
                                />
                            </div>

                            <div>
                                <h2 className="font-black text-slate-900">
                                    Add Category
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Create a merchandise group.
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={
                                submitCreate
                            }
                            className="mt-6 space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="category-name"
                                    className="mb-2 block text-sm font-bold text-slate-700"
                                >
                                    Category Name
                                </label>

                                <input
                                    id="category-name"
                                    type="text"
                                    value={
                                        createForm
                                            .data
                                            .name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        createForm.setData(
                                            'name',
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="College Uniform"
                                    className={`
                                        w-full rounded-xl
                                        border bg-white
                                        px-4 py-3
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:ring-4
                                        focus:ring-blue-500/10

                                        ${
                                            createForm
                                                .errors
                                                .name
                                                ? 'border-red-400 focus:border-red-500'
                                                : 'border-slate-300 focus:border-blue-500'
                                        }
                                    `}
                                />

                                {createForm
                                    .errors
                                    .name && (
                                    <p className="mt-2 text-sm font-semibold text-red-600">
                                        {
                                            createForm
                                                .errors
                                                .name
                                        }
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="category-description"
                                    className="mb-2 block text-sm font-bold text-slate-700"
                                >
                                    Description
                                </label>

                                <textarea
                                    id="category-description"
                                    value={
                                        createForm
                                            .data
                                            .description
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        createForm.setData(
                                            'description',
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="Optional description"
                                    className="
                                        min-h-28
                                        w-full
                                        resize-y
                                        rounded-xl
                                        border
                                        border-slate-300
                                        bg-white
                                        px-4 py-3
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                    "
                                />

                                {createForm
                                    .errors
                                    .description && (
                                    <p className="mt-2 text-sm font-semibold text-red-600">
                                        {
                                            createForm
                                                .errors
                                                .description
                                        }
                                    </p>
                                )}
                            </div>

                            <ActionProcessingButton
                                type="submit"
                                processing={createForm.processing}
                                disabled={
                                    !createForm.data.name.trim()
                                }
                                idleText="Create Category"
                                processingText="Creating Category..."
                                className="
                                    w-full
                                    bg-[#0D6EFD]
                                    py-3.5
                                    text-white
                                    hover:bg-blue-700
                                "
                            />
                        </form>
                    </section>

                    {/* LIST */}
                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Tags
                                        size={19}
                                    />
                                </div>

                                <div>
                                    <h2 className="font-black text-slate-900">
                                        Category List
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {
                                            categories.length
                                        }{' '}
                                        categor
                                        {categories.length ===
                                        1
                                            ? 'y'
                                            : 'ies'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 text-left">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                            Name
                                        </th>

                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                            Description
                                        </th>

                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                            Status
                                        </th>

                                        <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {categories.map(
                                        (
                                            category,
                                        ) => (
                                            <tr
                                                key={
                                                    category.id
                                                }
                                                className="border-t border-slate-100"
                                            >
                                                <td className="px-6 py-4 font-black text-slate-900">
                                                    {
                                                        category.name
                                                    }
                                                </td>

                                                <td className="max-w-md px-6 py-4 text-sm text-slate-500">
                                                    {category.description
                                                        ?? 'No description'}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`
                                                            inline-flex rounded-full
                                                            px-3 py-1
                                                            text-xs font-black

                                                            ${
                                                                category.is_active
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-red-100 text-red-700'
                                                            }
                                                        `}
                                                    >
                                                        {category.is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                startEdit(
                                                                    category,
                                                                )
                                                            }
                                                            className="
                                                                inline-flex
                                                                items-center
                                                                gap-2
                                                                rounded-xl
                                                                bg-blue-50
                                                                px-3 py-2
                                                                text-sm
                                                                font-bold
                                                                text-blue-700
                                                                transition
                                                                hover:bg-blue-100
                                                            "
                                                        >
                                                            <Pencil
                                                                size={15}
                                                            />

                                                            Edit
                                                        </button>

                                                   <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleStatus(category)
                                                        }
                                                        disabled={
                                                            processingCategoryId ===
                                                            category.id
                                                        }
                                                        className="
                                                            inline-flex
                                                            items-center
                                                            gap-2
                                                            rounded-xl
                                                            bg-slate-100
                                                            px-3 py-2
                                                            text-sm
                                                            font-bold
                                                            text-slate-700
                                                            transition
                                                            hover:bg-slate-200
                                                            disabled:cursor-not-allowed
                                                            disabled:opacity-60
                                                        "
                                                    >
                                                        {processingCategoryId ===
                                                        category.id ? (
                                                            <LoaderCircle
                                                                size={15}
                                                                className="animate-spin"
                                                            />
                                                        ) : (
                                                            <Power size={15} />
                                                        )}

                                                        {processingCategoryId ===
                                                        category.id
                                                            ? category.is_active
                                                                ? 'Deactivating...'
                                                                : 'Activating...'
                                                            : category.is_active
                                                            ? 'Deactivate'
                                                            : 'Activate'}
                                                    </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ),
                                    )}

                                    {categories.length ===
                                        0 && (
                                        <tr>
                                            <td
                                                colSpan={
                                                    4
                                                }
                                                className="px-6 py-14 text-center text-sm text-slate-500"
                                            >
                                                No categories created yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* EDIT MODAL */}
                {editingCategory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        Edit Category
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Update category information.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        closeEdit
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                                >
                                    <X
                                        size={17}
                                    />
                                </button>
                            </div>

                            <form
                                onSubmit={
                                    submitEdit
                                }
                                className="mt-6 space-y-5"
                            >
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Category Name
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            editForm
                                                .data
                                                .name
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            editForm.setData(
                                                'name',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                                    />

                                    {editForm
                                        .errors
                                        .name && (
                                        <p className="mt-2 text-sm font-semibold text-red-600">
                                            {
                                                editForm
                                                    .errors
                                                    .name
                                            }
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Description
                                    </label>

                                    <textarea
                                        value={
                                            editForm
                                                .data
                                                .description
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            editForm.setData(
                                                'description',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                                    />
                                </div>

                                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                                    <input
                                        type="checkbox"
                                        checked={
                                            editForm
                                                .data
                                                .is_active
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            editForm.setData(
                                                'is_active',
                                                event
                                                    .target
                                                    .checked,
                                            )
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                    />

                                    <span className="text-sm font-bold text-slate-700">
                                        Active category
                                    </span>
                                </label>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={
                                            closeEdit
                                        }
                                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
                                    >
                                        Cancel
                                    </button>

                                    <ActionProcessingButton
                                        type="submit"
                                        processing={editForm.processing}
                                        disabled={
                                            !editForm.data.name.trim()
                                        }
                                        idleText="Save Changes"
                                        processingText="Saving Changes..."
                                        className="
                                            bg-[#0D6EFD]
                                            px-5
                                            py-3
                                            text-white
                                            hover:bg-blue-700
                                        "
                                    />
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>


            <ActionConfirmModal
                open={statusCategory !== null}
                title={
                    statusCategory?.is_active
                        ? 'Deactivate Category?'
                        : 'Activate Category?'
                }
                message={
                    statusCategory
                        ? `${
                            statusCategory.is_active
                                ? 'Deactivate'
                                : 'Activate'
                        } ${statusCategory.name}?`
                        : ''
                }
                confirmText={
                    statusCategory?.is_active
                        ? 'Deactivate'
                        : 'Activate'
                }
                processingText={
                    statusCategory?.is_active
                        ? 'Deactivating...'
                        : 'Activating...'
                }
                processing={
                    statusCategory !== null &&
                    processingCategoryId ===
                        statusCategory.id
                }
                tone={
                    statusCategory?.is_active
                        ? 'danger'
                        : 'primary'
                }
                onCancel={() =>
                    setStatusCategory(null)
                }
                onConfirm={confirmToggleStatus}
            />

            <ActionConfirmModal
                open={showCreateConfirm}
                title="Create Category?"
                message={`Create ${createForm.data.name || 'this category'}?`}
                confirmText="Create Category"
                processingText="Creating Category..."
                processing={createForm.processing}
                tone="primary"
                onCancel={() =>
                    setShowCreateConfirm(false)
                }
                onConfirm={confirmCreateCategory}
            />

            <ActionConfirmModal
                open={showEditConfirm}
                title="Save Category Changes?"
                message={
                    editingCategory
                        ? `Save the updated information for ${editingCategory.name}?`
                        : ''
                }
                confirmText="Save Changes"
                processingText="Saving Changes..."
                processing={editForm.processing}
                tone="primary"
                onCancel={() =>
                    setShowEditConfirm(false)
                }
                onConfirm={confirmEditCategory}
            />

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}

        </AdminLayout>
    );
}