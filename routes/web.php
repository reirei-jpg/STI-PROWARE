<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminOrderController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ProductVariantController;
use App\Http\Controllers\Admin\PurchaseOrderController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\SalesController;
use App\Http\Controllers\Admin\StaffUserController;
use App\Http\Controllers\Admin\StockReceiptController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WaitingListController;
use App\Http\Controllers\Auth\RequiredPasswordChangeController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CartPageController;
use App\Http\Controllers\Cashier\CashierOrderController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderReceiptController;
use App\Http\Controllers\QrOrderScanController;
use App\Http\Controllers\Specialist\OrderScanController;
use App\Http\Controllers\Specialist\PreorderConfigurationController;
use App\Http\Controllers\Staff\InventoryAdjustmentController;
use App\Http\Controllers\Staff\InventoryController;
use App\Http\Controllers\Staff\StockMovementController;
use App\Http\Controllers\Student\OrderQrController;
use App\Http\Controllers\Student\StudentDashboardController;
use App\Http\Controllers\Student\StudentOrderController;
use App\Http\Controllers\Student\StudentOrderDetailsController;
use App\Http\Controllers\Student\StudentPreorderController;
use App\Http\Controllers\Student\StudentProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::get(
    '/',
    function () {
        return Inertia::render(
            'welcome',
        );
    },
)->name(
    'home',
);

/*
|--------------------------------------------------------------------------
| Required Password Change
|--------------------------------------------------------------------------
*/

Route::get(
    '/password/change-required',
    [
        RequiredPasswordChangeController::class,
        'edit',
    ],
)
    ->middleware(
        'auth',
    )
    ->name(
        'password.change-required',
    );

Route::patch(
    '/password/change-required',
    [
        RequiredPasswordChangeController::class,
        'update',
    ],
)
    ->middleware(
        'auth',
    )
    ->name(
        'password.change-required.update',
    );

/*
|--------------------------------------------------------------------------
| Authenticated PROWARE Routes
|--------------------------------------------------------------------------
*/

Route::middleware([
    'auth',
    'force.password.change',
])
    ->group(function () {

        /*
        |--------------------------------------------------------------------------
        | Notifications
        |--------------------------------------------------------------------------
        */

        Route::patch(
            '/notifications/read-all',
            [
                NotificationController::class,
                'readAll',
            ],
        )->name(
            'notifications.read-all',
        );

        Route::patch(
            '/notifications/{notification}/read',
            [
                NotificationController::class,
                'read',
            ],
        )->name(
            'notifications.read',
        );

        /*
        |--------------------------------------------------------------------------
        | Shared Merchandise Catalog
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/catalog',
            [
                CatalogController::class,
                'index',
            ],
        )
            ->middleware(
                'role:super_admin,admin,specialist,cashier,student'
            )
            ->name(
                'catalog.index',
            );

        Route::get(
            '/catalog/{product}',
            [
                CatalogController::class,
                'show',
            ],
        )
            ->middleware(
                'role:super_admin,admin,specialist,cashier,student',
            )
            ->name(
                'catalog.show',
            );

        /*
        |--------------------------------------------------------------------------
        | Shared Order QR Scan
        |--------------------------------------------------------------------------
        |
        | Cashier:
        | QR -> payment verification
        |
        | Specialist:
        | QR -> fulfillment verification
        |
        */

        Route::get(
            '/orders/scan/{token}',
            [
                QrOrderScanController::class,
                'show',
            ],
        )
            ->middleware(
                'role:cashier,specialist',
            )
            ->name(
                'orders.scan',
            );

        /*
        |--------------------------------------------------------------------------
        | Student Shopping Cart
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/cart',
            [
                CartPageController::class,
                'index',
            ],
        )
            ->middleware(
                'role:student',
            )
            ->name(
                'cart.index',
            );

        Route::post(
            '/cart/items',
            [
                CartController::class,
                'store',
            ],
        )
            ->middleware(
                'role:student,specialist',
            )
            ->name(
                'cart.items.store',
            );

        Route::patch(
            '/cart/items/{cartItem}',
            [
                CartController::class,
                'update',
            ],
        )
            ->middleware(
                'role:student',
            )
            ->name(
                'cart.items.update',
            );

        Route::delete(
            '/cart/items/{cartItem}',
            [
                CartController::class,
                'destroy',
            ],
        )
            ->middleware(
                'role:student',
            )
            ->name(
                'cart.items.destroy',
            );

        /*
        |--------------------------------------------------------------------------
        | Shared Staff Routes
        |--------------------------------------------------------------------------
        |
        | Admin and Specialist can use these routes.
        |
        */

        Route::prefix(
            'staff',
        )
            ->name(
                'staff.',
            )
            ->middleware(
                'role:super_admin,admin,specialist'
            )
            ->group(function () {

                /*
                |--------------------------------------------------------------------------
                | Stock Receipt History
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/stock-receipts',
                    [
                        StockReceiptController::class,
                        'index',
                    ],
                )->name(
                    'stock-receipts.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Register Manual PO Item As Product
                |--------------------------------------------------------------------------
                |
                | Converts a manual purchase-order item into a real PROWARE
                | inventory product before stock receiving.
                |
                */

                Route::post(
                    '/stock-receipts/purchase-order-items/{purchaseOrderItem}/register-product',
                    [
                        StockReceiptController::class,
                        'registerPurchaseOrderItemProduct',
                    ],
                )->name(
                    'stock-receipts.purchase-order-items.register-product',
                );

                Route::post(
                    '/stock-receipts/purchase-order-items/{purchaseOrderItem}/link-variant',
                    [
                        StockReceiptController::class,
                        'linkPurchaseOrderItemVariant',
                    ],
                )->name(
                    'stock-receipts.purchase-order-items.link-variant',
                );

                /*
                |--------------------------------------------------------------------------
                | Receive Stock
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/stock-receipts/create',
                    [
                        StockReceiptController::class,
                        'create',
                    ],
                )->name(
                    'stock-receipts.create',
                );

                Route::post(
                    '/stock-receipts',
                    [
                        StockReceiptController::class,
                        'store',
                    ],
                )->name(
                    'stock-receipts.store',
                );

                /*
                |--------------------------------------------------------------------------
                | Stock Receipt Details
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/stock-receipts/{stockMovement}',
                    [
                        StockReceiptController::class,
                        'show',
                    ],
                )->name(
                    'stock-receipts.show',
                );

                /*
|--------------------------------------------------------------------------
| Inventory Management
|--------------------------------------------------------------------------
*/

                Route::get(
                    '/inventory',
                    [
                        InventoryController::class,
                        'index',
                    ],
                )->name(
                    'inventory.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Stock In / Stock Out
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/inventory/movements',
                    [
                        StockMovementController::class,
                        'index',
                    ],
                )->name(
                    'inventory.movements',
                );

                Route::patch(
                    '/inventory/{inventory}/reorder-level',
                    [
                        InventoryController::class,
                        'updateReorderLevel',
                    ],
                )->name(
                    'inventory.reorder-level.update',
                );

                /*
                |--------------------------------------------------------------------------
                | Inventory Adjustments
                |--------------------------------------------------------------------------
                |
                | Admin-only. The only way to change quantity_on_hand outside
                | of a purchase-order receipt, a sale, or a release.
                |
                */

                Route::post(
                    '/inventory/adjustments',
                    [
                        InventoryAdjustmentController::class,
                        'store',
                    ],
                )->name(
                    'inventory.adjustments.store',
                );

            });

        /*
        |--------------------------------------------------------------------------
        | Admin Routes
        |--------------------------------------------------------------------------
        */

        Route::prefix(
            'admin',
        )
            ->name(
                'admin.',
            )
            ->middleware(
                'role:super_admin,admin',
            )
            ->group(function () {

                Route::get(
                    '/purchase-orders/archive',
                    [
                        PurchaseOrderController::class,
                        'archiveIndex',
                    ],
                )->name(
                    'purchase-orders.archive.index',
                );

                /*
                    |--------------------------------------------------------------------------
                    | Purchase Orders
                    |--------------------------------------------------------------------------
                    */

                Route::get(
                    '/purchase-orders',
                    [
                        PurchaseOrderController::class,
                        'index',
                    ],
                )->name(
                    'purchase-orders.index',
                );

                Route::get(
                    '/purchase-orders/create',
                    [
                        PurchaseOrderController::class,
                        'create',
                    ],
                )->name(
                    'purchase-orders.create',
                );

                Route::post(
                    '/purchase-orders',
                    [
                        PurchaseOrderController::class,
                        'store',
                    ],
                )->name(
                    'purchase-orders.store',
                );

                Route::get(
                    '/purchase-orders/archived-items',
                    [
                        PurchaseOrderController::class,
                        'archivedItemsIndex',
                    ],
                )->name(
                    'purchase-orders.archived-items.index',
                );

                Route::get(
                    '/purchase-orders/{purchaseOrder}',
                    [
                        PurchaseOrderController::class,
                        'show',
                    ],
                )->name(
                    'purchase-orders.show',
                );

                /*
                |--------------------------------------------------------------------------
                | Purchase Order Item Management
                |--------------------------------------------------------------------------
                |
                | Admin can add, edit, and archive items inside an existing PO.
                | Purchase order items are never permanently deleted.
                |
                */

                Route::post(
                    '/purchase-orders/{purchaseOrder}/items',
                    [
                        PurchaseOrderController::class,
                        'storeItem',
                    ],
                )->name(
                    'purchase-orders.items.store',
                );

                Route::patch(
                    '/purchase-orders/{purchaseOrder}/items/{purchaseOrderItem}',
                    [
                        PurchaseOrderController::class,
                        'updateItem',
                    ],
                )->name(
                    'purchase-orders.items.update',
                );

                Route::patch(
                    '/purchase-orders/{purchaseOrder}/items/{purchaseOrderItem}/archive',
                    [
                        PurchaseOrderController::class,
                        'archiveItem',
                    ],
                )->name(
                    'purchase-orders.items.archive',
                );

                Route::patch(
                    '/purchase-orders/{purchaseOrder}/items/{purchaseOrderItem}/restore',
                    [
                        PurchaseOrderController::class,
                        'restoreItem',
                    ],
                )->name(
                    'purchase-orders.items.restore',
                );

                /*
                |--------------------------------------------------------------------------
                | Archive Purchase Order
                |--------------------------------------------------------------------------
                |
                | Purchase orders are never permanently deleted.
                | Archiving preserves the PO for historical tracking.
                |
                */

                Route::patch(
                    '/purchase-orders/{purchaseOrder}/archive',
                    [
                        PurchaseOrderController::class,
                        'archive',
                    ],
                )->name(
                    'purchase-orders.archive',
                );

                Route::patch(
                    '/purchase-orders/{purchaseOrder}/restore',
                    [
                        PurchaseOrderController::class,
                        'restore',
                    ],
                )->name(
                    'purchase-orders.restore',
                );

                /*
                |--------------------------------------------------------------------------
                | Waiting List
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/waiting-list',
                    [
                        WaitingListController::class,
                        'index',
                    ],
                )->name(
                    'waiting-list.index',
                );

                Route::patch(
                    '/waiting-list/{orderItem}/process',
                    [
                        WaitingListController::class,
                        'process',
                    ],
                )->name(
                    'waiting-list.process',
                );

                /*
                |--------------------------------------------------------------------------
                | Analytics (merged into Reports)
                |--------------------------------------------------------------------------
                |
                | Analytics and Reports were merged into one page.
                | This keeps old bookmarks/links working.
                |
                */

                Route::redirect(
                    '/analytics',
                    '/admin/reports',
                )->name(
                    'analytics.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Admin Dashboard
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/dashboard',
                    [
                        AdminDashboardController::class,
                        'index',
                    ],
                )->name(
                    'dashboard',
                );

                /*
                |--------------------------------------------------------------------------
                | Audit Logs
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/audit-logs',
                    [
                        AuditLogController::class,
                        'index',
                    ],
                )->name(
                    'audit-logs.index',
                );

                /*
                |--------------------------------------------------------------------------
                | User Management
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/users',
                    [
                        UserController::class,
                        'index',
                    ],
                )->name(
                    'users.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Staff Account Creation
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/users/create',
                    [
                        StaffUserController::class,
                        'create',
                    ],
                )->name(
                    'users.create',
                );

                Route::post(
                    '/users',
                    [
                        StaffUserController::class,
                        'store',
                    ],
                )->name(
                    'users.store',
                );

                /*
                |--------------------------------------------------------------------------
                | Staff Account Editing
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/users/{user}/edit',
                    [
                        StaffUserController::class,
                        'edit',
                    ],
                )->name(
                    'users.edit',
                );

                Route::put(
                    '/users/{user}',
                    [
                        StaffUserController::class,
                        'update',
                    ],
                )->name(
                    'users.update',
                );

                /*
                |--------------------------------------------------------------------------
                | Activate / Deactivate Accounts
                |--------------------------------------------------------------------------
                */

                Route::patch(
                    '/users/{user}/activate',
                    [
                        UserController::class,
                        'activate',
                    ],
                )->name(
                    'users.activate',
                );

                Route::patch(
                    '/users/{user}/deactivate',
                    [
                        UserController::class,
                        'deactivate',
                    ],
                )->name(
                    'users.deactivate',
                );

                /*
                |--------------------------------------------------------------------------
                | Reports
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/reports',
                    [
                        ReportController::class,
                        'index',
                    ],
                )->name(
                    'reports.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Admin Orders
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/orders',
                    [
                        AdminOrderController::class,
                        'index',
                    ],
                )->name(
                    'orders.index',
                );

                Route::get(
                    '/orders/{order}',
                    [
                        AdminOrderController::class,
                        'show',
                    ],
                )->name(
                    'orders.show',
                );

                /*
                |--------------------------------------------------------------------------
                | Admin Sales
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/sales',
                    [
                        SalesController::class,
                        'index',
                    ],
                )->name(
                    'sales.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Categories
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/categories',
                    [
                        CategoryController::class,
                        'index',
                    ],
                )->name(
                    'categories.index',
                );

                Route::post(
                    '/categories',
                    [
                        CategoryController::class,
                        'store',
                    ],
                )->name(
                    'categories.store',
                );

                Route::put(
                    '/categories/{category}',
                    [
                        CategoryController::class,
                        'update',
                    ],
                )->name(
                    'categories.update',
                );

                /*
                |--------------------------------------------------------------------------
                | Products
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/products',
                    [
                        ProductController::class,
                        'index',
                    ],
                )->name(
                    'products.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Edit Product
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/products/{product}/edit',
                    [
                        ProductController::class,
                        'edit',
                    ],
                )->name(
                    'products.edit',
                );

                Route::put(
                    '/products/{product}',
                    [
                        ProductController::class,
                        'update',
                    ],
                )->name(
                    'products.update',
                );

                /*
                 * Keep /products/create before
                 * dynamic product routes.
                 */

                Route::get(
                    '/products/create',
                    [
                        ProductController::class,
                        'create',
                    ],
                )->name(
                    'products.create',
                );

                Route::post(
                    '/products',
                    [
                        ProductController::class,
                        'store',
                    ],
                )->name(
                    'products.store',
                );

                /*
                |--------------------------------------------------------------------------
                | Product Variant Management
                |--------------------------------------------------------------------------
                |
                | GET:
                | /admin/products/{product}/variants
                |
                | POST:
                | /admin/products/{product}/variants
                |
                | PATCH:
                | /admin/products/{product}/variants/{variant}/status
                |
                */

                Route::get(
                    '/products/{product}/variants',
                    [
                        ProductVariantController::class,
                        'index',
                    ],
                )->name(
                    'products.variants.index',
                );

                Route::post(
                    '/products/{product}/variants',
                    [
                        ProductVariantController::class,
                        'store',
                    ],
                )->name(
                    'products.variants.store',
                );

                Route::patch(
                    '/products/{product}/variants/{variant}/status',
                    [
                        ProductVariantController::class,
                        'toggleStatus',
                    ],
                )->name(
                    'products.variants.status',
                );
            });

        /*
        |--------------------------------------------------------------------------
        | Student Routes
        |--------------------------------------------------------------------------
        */

        Route::prefix(
            'student',
        )
            ->name(
                'student.',
            )
            ->middleware(
                'role:student',
            )
            ->group(function () {

                /*
                |--------------------------------------------------------------------------
                | Student Profile
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/profile',
                    [
                        StudentProfileController::class,
                        'show',
                    ],
                )->name(
                    'profile.show',
                );

                /*
                |--------------------------------------------------------------------------
                | Student Dashboard
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/dashboard',
                    StudentDashboardController::class,
                )->name(
                    'dashboard',
                );

                /**
                 * |--------------------------------------------------------------------------
                 * | Student Preorders
                 * |--------------------------------------------------------------------------
                 */
                Route::get(
                    '/preorders',
                    [
                        StudentPreorderController::class,
                        'index',
                    ],
                )->name(
                    'preorders.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Student Orders
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/orders',
                    [
                        StudentOrderController::class,
                        'index',
                    ],
                )->name(
                    'orders.index',
                );

                Route::get(
                    '/orders/{order}',
                    [
                        StudentOrderDetailsController::class,
                        'show',
                    ],
                )->name(
                    'orders.show',
                );

                Route::get(
                    '/orders/{order}/receipt',
                    [
                        OrderReceiptController::class,
                        'show',
                    ],
                )->name(
                    'orders.receipt',
                );
                /*
                |--------------------------------------------------------------------------
                | Student Order QR
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/orders/{order}/qr',
                    [
                        OrderQrController::class,
                        'show',
                    ],
                )->name(
                    'orders.qr',
                );
            });

        /*
        |--------------------------------------------------------------------------
        | QR Scanner Camera
        |--------------------------------------------------------------------------
        |
        | Shared by Cashier and Specialist.
        |
        */

        Route::get(
            '/orders/scanner',
            function () {
                return Inertia::render(
                    'qr/Scanner',
                );
            },
        )
            ->middleware(
                'role:cashier,specialist',
            )
            ->name(
                'orders.scanner',
            );

        /**
        |--------------------------------------------------------------------------
        | Specialist Routes
        |--------------------------------------------------------------------------
         */
        Route::prefix('specialist')
            ->name('specialist.')
            ->middleware('role:specialist')
            ->group(function () {

                /*
                |--------------------------------------------------------------------------
                | Release History
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/releases',
                    [
                        OrderScanController::class,
                        'releaseHistory',
                    ],
                )->name(
                    'releases.index',
                );

                Route::get(
                    '/releases/{order}',
                    [
                        OrderScanController::class,
                        'releaseHistoryShow',
                    ],
                )->name(
                    'releases.show',
                );

                /**
                |--------------------------------------------------------------------------
                | Specialist Dashboard
                |--------------------------------------------------------------------------
                 */
                Route::get(
                    '/dashboard',
                    function () {
                        return Inertia::render(
                            'specialist/Dashboard',
                        );
                    },
                )->name(
                    'dashboard',
                );

                /*
                |--------------------------------------------------------------------------
                | New Merchandise Preorder Configuration
                |--------------------------------------------------------------------------
                |
                | Specialists may configure preorder settings only for purchase-order
                | items that were classified as genuinely NEW merchandise.
                |
                */

                Route::patch(
                    '/purchase-order-items/{purchaseOrderItem}/preorder-configuration',
                    [
                        PreorderConfigurationController::class,
                        'update',
                    ],
                )->name(
                    'purchase-order-items.preorder-configuration.update',
                );

                /**
                |--------------------------------------------------------------------------
                | Order Fulfillment Queue
                |--------------------------------------------------------------------------
                 */
                Route::get(
                    '/orders',
                    [
                        OrderScanController::class,
                        'index',
                    ],
                )->name(
                    'orders.index',
                );

                /**
                |--------------------------------------------------------------------------
                | Specialist QR Order Verification
                |--------------------------------------------------------------------------
                |
                | This route is used ONLY when the Specialist scans
                | the student's one-time Release QR.
                |
                | IMPORTANT:
                | Keep this route before /orders/{order}.
                |
                 */
                Route::get(
                    '/orders/scan/{token}',
                    [
                        OrderScanController::class,
                        'show',
                    ],
                )->name(
                    'orders.scan',
                );

                /**
                |--------------------------------------------------------------------------
                | Open Previously Verified Order
                |--------------------------------------------------------------------------
                |
                | After the Release QR has been successfully scanned,
                | the Specialist can reopen the order from the
                | fulfillment queue without scanning the QR again.
                |
                 */
                Route::get(
                    '/orders/{order}',
                    [
                        OrderScanController::class,
                        'showOrder',
                    ],
                )->name(
                    'orders.show',
                );

                /**
                |--------------------------------------------------------------------------
                | Mark Order Ready for Pickup
                |--------------------------------------------------------------------------
                 */
                Route::patch(
                    '/orders/{order}/ready',
                    [
                        OrderScanController::class,
                        'markReady',
                    ],
                )->name(
                    'orders.ready',
                );

                /**
                |--------------------------------------------------------------------------
                | Release Merchandise
                |--------------------------------------------------------------------------
                 */
                Route::patch(
                    '/orders/{order}/release',
                    [
                        OrderScanController::class,
                        'release',
                    ],
                )->name(
                    'orders.release',
                );
            });

        /*
        |--------------------------------------------------------------------------
        | Cashier Routes
        |--------------------------------------------------------------------------
        */

        Route::prefix(
            'cashier',
        )
            ->name(
                'cashier.',
            )
            ->middleware(
                'role:cashier',
            )
            ->group(function () {

                /*
                |--------------------------------------------------------------------------
                | Cashier Dashboard
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/dashboard',
                    [
                        CashierOrderController::class,
                        'dashboard',
                    ],
                )->name(
                    'dashboard',
                );

                /*
                |--------------------------------------------------------------------------
                | Payment History
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/payments',
                    [
                        CashierOrderController::class,
                        'paymentHistory',
                    ],
                )->name(
                    'payments.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Pending Payment Orders
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/orders',
                    [
                        CashierOrderController::class,
                        'index',
                    ],
                )->name(
                    'orders.index',
                );

                /*
                |--------------------------------------------------------------------------
                | Payment QR Scan
                |--------------------------------------------------------------------------
                |
                | IMPORTANT:
                | This must stay BEFORE /orders/{order}.
                |
                | The Cashier scans the student's Payment QR here.
                |
                */

                Route::get(
                    '/orders/scan/{token}',
                    [
                        CashierOrderController::class,
                        'scan',
                    ],
                )->name(
                    'orders.scan',
                );

                /*
                |--------------------------------------------------------------------------
                | Cashier Order Details
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/orders/{order}',
                    [
                        CashierOrderController::class,
                        'show',
                    ],
                )->name(
                    'orders.show',
                );

                /*
                |--------------------------------------------------------------------------
                | Order Receipt
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/orders/{order}/receipt',
                    [
                        OrderReceiptController::class,
                        'show',
                    ],
                )->name(
                    'orders.receipt',
                );

                /*
                |--------------------------------------------------------------------------
                | Confirm Payment
                |--------------------------------------------------------------------------
                */

                Route::patch(
                    '/orders/{order}/payment',
                    [
                        CashierOrderController::class,
                        'confirmPayment',
                    ],
                )->name(
                    'orders.payment.confirm',
                );
            });
        /*
        |--------------------------------------------------------------------------
        | Student Checkout
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/checkout',
            [
                CheckoutController::class,
                'index',
            ],
        )
            ->middleware(
                'role:student',
            )
            ->name(
                'checkout.index',
            );

        Route::post(
            '/checkout',
            [
                CheckoutController::class,
                'store',
            ],
        )
            ->middleware(
                'role:student',
            )
            ->name(
                'checkout.store',
            );
    });

/*
|--------------------------------------------------------------------------
| Settings Routes
|--------------------------------------------------------------------------
*/

require __DIR__.'/settings.php';
