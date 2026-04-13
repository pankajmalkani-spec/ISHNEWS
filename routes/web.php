<?php

use App\Http\Controllers\Mwadmin\AuthController;
use App\Services\MwadminAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Home');
});

Route::prefix('mwadmin')->group(function (): void {
    Route::get('/', fn () => redirect()->route('mwadmin.login'));
    Route::get('/login', [AuthController::class, 'loginForm'])->name('mwadmin.login');
    Route::post('/login/service', [AuthController::class, 'login'])->name('mwadmin.login.service');
    Route::post('/logout', [AuthController::class, 'logout'])->name('mwadmin.logout');

    Route::middleware('mwadmin.auth')->group(function (): void {
        $authProps = static function (Request $request): array {
            $session = (array) $request->session()->get('ishnews_session', []);
            if (! empty($session['validated']) && empty($session['modules'])) {
                $session = app(MwadminAccessService::class)->mergeModulesIntoSession($session);
                $request->session()->put('ishnews_session', $session);
            }

            return [
                'authUser' => [
                    'user_id' => (int) ($session['user_id'] ?? 0),
                    'username' => (string) ($session['username'] ?? ''),
                    'first_name' => (string) ($session['first_name'] ?? ''),
                    'last_name' => (string) ($session['last_name'] ?? ''),
                    'superaccess' => (bool) ($session['superaccess'] ?? false),
                    'modules' => (array) ($session['modules'] ?? []),
                ],
            ];
        };

        Route::get('/access-denied', function (Request $request) use ($authProps) {
            return Inertia::render('Mwadmin/AccessDenied', $authProps($request));
        })->name('mwadmin.access_denied');

        Route::middleware('mwadmin.can:dashboard')->group(function () use ($authProps): void {
            Route::get('/dashboard', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Dashboard', $authProps($request));
            })->name('mwadmin.dashboard');
        });

        Route::middleware('mwadmin.can:category')->group(function () use ($authProps): void {
            Route::get('/category', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Category/Index', $authProps($request));
            })->name('mwadmin.category.index');

            Route::get('/category/create', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Category/Create', $authProps($request));
            })->name('mwadmin.category.create');

            Route::get('/category/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Category/Edit', array_merge(
                    $authProps($request),
                    ['categoryId' => $id]
                ));
            })->name('mwadmin.category.edit');

            Route::get('/category/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Category/View', array_merge(
                    $authProps($request),
                    ['categoryId' => $id]
                ));
            })->name('mwadmin.category.view');
        });

        Route::middleware('mwadmin.can:subcategory')->group(function () use ($authProps): void {
            Route::get('/subcategory', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Subcategory/Index', $authProps($request));
            })->name('mwadmin.subcategory.index');

            Route::get('/subcategory/create', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Subcategory/Create', $authProps($request));
            })->name('mwadmin.subcategory.create');

            Route::get('/subcategory/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Subcategory/Edit', array_merge(
                    $authProps($request),
                    ['subcategoryId' => $id]
                ));
            })->name('mwadmin.subcategory.edit');

            Route::get('/subcategory/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Subcategory/View', array_merge(
                    $authProps($request),
                    ['subcategoryId' => $id]
                ));
            })->name('mwadmin.subcategory.view');
        });

        Route::middleware('mwadmin.can:sponsorcategory')->group(function () use ($authProps): void {
            Route::get('/sponsorcategory', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Sponsorcategory/Index', $authProps($request));
            })->name('mwadmin.sponsorcategory.index');

            Route::get('/sponsorcategory/create', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Sponsorcategory/Create', $authProps($request));
            })->name('mwadmin.sponsorcategory.create');

            Route::get('/sponsorcategory/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Sponsorcategory/Edit', array_merge(
                    $authProps($request),
                    ['sponsorcategoryId' => $id]
                ));
            })->name('mwadmin.sponsorcategory.edit');

            Route::get('/sponsorcategory/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Sponsorcategory/View', array_merge(
                    $authProps($request),
                    ['sponsorcategoryId' => $id]
                ));
            })->name('mwadmin.sponsorcategory.view');
        });

        Route::middleware('mwadmin.can:users')->group(function () use ($authProps): void {
            Route::get('/users', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Users/Index', $authProps($request));
            })->name('mwadmin.users.index');

            Route::get('/users/create', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Users/Create', $authProps($request));
            })->name('mwadmin.users.create');

            Route::get('/users/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Users/Edit', array_merge(
                    $authProps($request),
                    ['userId' => $id]
                ));
            })->name('mwadmin.users.edit');

            Route::get('/users/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Users/View', array_merge(
                    $authProps($request),
                    ['userId' => $id]
                ));
            })->name('mwadmin.users.view');
        });

        Route::middleware('mwadmin.can:roles')->group(function () use ($authProps): void {
            Route::get('/roles', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Roles/Index', $authProps($request));
            })->name('mwadmin.roles.index');

            Route::get('/roles/create', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Roles/Create', $authProps($request));
            })->name('mwadmin.roles.create');

            Route::get('/roles/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Roles/Edit', array_merge(
                    $authProps($request),
                    ['roleId' => $id]
                ));
            })->name('mwadmin.roles.edit');

            Route::get('/roles/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Roles/View', array_merge(
                    $authProps($request),
                    ['roleId' => $id]
                ));
            })->name('mwadmin.roles.view');
        });

        Route::middleware('mwadmin.can:newsletter')->group(function () use ($authProps): void {
            Route::get('/newsletter', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Newsletter/Index', $authProps($request));
            })->name('mwadmin.newsletter.index');
        });

        Route::middleware('mwadmin.can:newslisting')->group(function () use ($authProps): void {
            Route::get('/newslisting', fn (Request $request) => Inertia::render('Mwadmin/Newslisting/Index', $authProps($request)))->name('mwadmin.newslisting.index');
            Route::get('/newslisting/create', fn (Request $request) => Inertia::render('Mwadmin/Newslisting/Create', $authProps($request)))->name('mwadmin.newslisting.create');
            Route::get('/newslisting/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Newslisting/Edit', array_merge($authProps($request), ['newslistingId' => $id])))->name('mwadmin.newslisting.edit');
        });

        Route::middleware('mwadmin.can:schedule')->group(function () use ($authProps): void {
            Route::get('/schedule', fn (Request $request) => Inertia::render('Mwadmin/Schedule/Index', $authProps($request)))->name('mwadmin.schedule.index');
        });

        Route::middleware('mwadmin.can:newsource')->group(function () use ($authProps): void {
            Route::get('/newsource', fn (Request $request) => Inertia::render('Mwadmin/Newsource/Index', $authProps($request)))->name('mwadmin.newsource.index');
            Route::get('/newsource/create', fn (Request $request) => Inertia::render('Mwadmin/Newsource/Create', $authProps($request)))->name('mwadmin.newsource.create');
            Route::get('/newsource/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Newsource/Edit', array_merge($authProps($request), ['newsourceId' => $id])))->name('mwadmin.newsource.edit');
        });

        Route::middleware('mwadmin.can:designation')->group(function () use ($authProps): void {
            Route::get('/designation', fn (Request $request) => Inertia::render('Mwadmin/Designation/Index', $authProps($request)))->name('mwadmin.designation.index');
            Route::get('/designation/create', fn (Request $request) => Inertia::render('Mwadmin/Designation/Create', $authProps($request)))->name('mwadmin.designation.create');
            Route::get('/designation/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Designation/Edit', array_merge($authProps($request), ['designationId' => $id])))->name('mwadmin.designation.edit');
        });

        Route::middleware('mwadmin.can:sponsor')->group(function () use ($authProps): void {
            Route::get('/sponsor', fn (Request $request) => Inertia::render('Mwadmin/Sponsor/Index', $authProps($request)))->name('mwadmin.sponsor.index');
            Route::get('/sponsor/create', fn (Request $request) => Inertia::render('Mwadmin/Sponsor/Create', $authProps($request)))->name('mwadmin.sponsor.create');
            Route::get('/sponsor/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Sponsor/Edit', array_merge($authProps($request), ['sponsorId' => $id])))->name('mwadmin.sponsor.edit');
            Route::get('/sponsor/{id}/view', fn (Request $request, int $id) => Inertia::render('Mwadmin/Sponsor/View', array_merge($authProps($request), ['sponsorId' => $id])))->name('mwadmin.sponsor.view');
        });

        Route::middleware('mwadmin.can:advertisement')->group(function () use ($authProps): void {
            Route::get('/advertisement', fn (Request $request) => Inertia::render('Mwadmin/Advertisement/Index', $authProps($request)))->name('mwadmin.advertisement.index');
            Route::get('/advertisement/create', fn (Request $request) => Inertia::render('Mwadmin/Advertisement/Create', $authProps($request)))->name('mwadmin.advertisement.create');
            Route::get('/advertisement/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Advertisement/Edit', array_merge($authProps($request), ['advertisementId' => $id])))->name('mwadmin.advertisement.edit');
            Route::get('/advertisement/{id}/view', fn (Request $request, int $id) => Inertia::render('Mwadmin/Advertisement/View', array_merge($authProps($request), ['advertisementId' => $id])))->name('mwadmin.advertisement.view');
        });

        Route::middleware('mwadmin.can:flowchart')->group(function () use ($authProps): void {
            Route::get('/flowchart', fn (Request $request) => Inertia::render('Mwadmin/Flowchart/Index', $authProps($request)))->name('mwadmin.flowchart.index');
            Route::get('/flowchart/create', fn (Request $request) => Inertia::render('Mwadmin/Flowchart/Create', $authProps($request)))->name('mwadmin.flowchart.create');
            Route::get('/flowchart/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Flowchart/Edit', array_merge($authProps($request), ['flowchartId' => $id])))->name('mwadmin.flowchart.edit');
            Route::get('/flowchart/{id}/view', fn (Request $request, int $id) => Inertia::render('Mwadmin/Flowchart/View', array_merge($authProps($request), ['flowchartId' => $id])))->name('mwadmin.flowchart.view');
        });
    });
});
