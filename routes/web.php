<?php

use App\Http\Controllers\Frontend\CategoryController;
use App\Http\Controllers\Frontend\HomeController;
use App\Http\Controllers\Frontend\PageController;
use App\Http\Controllers\Frontend\SearchController;
use App\Http\Controllers\Frontend\VideoController;
use App\Http\Controllers\Mwadmin\AuthController;
use App\Services\MwadminAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/index', [HomeController::class, 'index'])->name('home.index');

Route::get('/about', [PageController::class, 'about'])->name('about');
Route::get('/contact', [PageController::class, 'contact'])->name('contact');
Route::post('/contact', [PageController::class, 'contactSubmit'])->name('contact.submit');
Route::get('/sitemap', [PageController::class, 'sitemap'])->name('sitemap');

Route::get('/set-theme/{theme}', function (Request $request, string $theme) {
    if (! in_array($theme, ['legacy', 'modern'], true)) {
        abort(404);
    }

    return redirect()
        ->back()
        ->cookie('ish_frontend_theme', $theme, 60 * 24 * 365);
})->name('theme.set');

Route::get('/search', [SearchController::class, 'index'])->name('search');

Route::get('/videos/{categoryCode}/{permalink}', [VideoController::class, 'show'])
    ->where('categoryCode', '[a-zA-Z0-9_-]+')
    ->where('permalink', '[^/]+')
    ->name('video.show');

Route::get('/category/{categoryCode}/load-more', [CategoryController::class, 'loadMore'])
    ->where('categoryCode', '[a-zA-Z0-9_-]+')
    ->name('category.load_more');

Route::get('/category/{categoryCode}/{subcategoryCode?}', [CategoryController::class, 'show'])
    ->where('categoryCode', '[a-zA-Z0-9_-]+')
    ->where('subcategoryCode', '[a-zA-Z0-9_-]+')
    ->name('category.show');

Route::prefix('mwadmin')->group(function (): void {
    Route::get('/', fn () => redirect()->route('mwadmin.login'));
    Route::get('/login', [AuthController::class, 'loginForm'])->name('mwadmin.login');
    Route::post('/login/service', [AuthController::class, 'login'])->name('mwadmin.login.service');
    Route::post('/logout', [AuthController::class, 'logout'])->name('mwadmin.logout');

    Route::middleware('mwadmin.auth')->group(function (): void {
        $authProps = static function (Request $request): array {
            $session = (array) $request->session()->get('ishnews_session', []);
            $access = app(MwadminAccessService::class);
            if ($access->shouldRefreshModules($session)) {
                $session = $access->mergeModulesIntoSession($session);
                $request->session()->put('ishnews_session', $session);
            }

            $photo = (string) ($session['profile_photo'] ?? '');
            $profilePhotoUrl = $photo !== ''
                ? '/images/UserProfile_photo/'.basename(str_replace('\\', '/', $photo))
                : null;

            return [
                'authUser' => [
                    'user_id' => (int) ($session['user_id'] ?? 0),
                    'username' => (string) ($session['username'] ?? ''),
                    'first_name' => (string) ($session['first_name'] ?? ''),
                    'last_name' => (string) ($session['last_name'] ?? ''),
                    'superaccess' => (bool) ($session['superaccess'] ?? false),
                    'modules' => (array) ($session['modules'] ?? []),
                    'profile_photo_url' => $profilePhotoUrl,
                ],
            ];
        };

        Route::get('/access-denied', function (Request $request) use ($authProps) {
            return Inertia::render('Mwadmin/AccessDenied', $authProps($request));
        })->name('mwadmin.access_denied');

        Route::get('/profile', function (Request $request) use ($authProps) {
            return Inertia::render('Mwadmin/Profile/Index', $authProps($request));
        })->name('mwadmin.profile');

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
            })->middleware('mwadmin.canFlag:category,allow_add')->name('mwadmin.category.create');

            Route::get('/category/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Category/Edit', array_merge(
                    $authProps($request),
                    ['categoryId' => $id]
                ));
            })->middleware('mwadmin.canFlag:category,allow_edit')->name('mwadmin.category.edit');

            Route::get('/category/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Category/View', array_merge(
                    $authProps($request),
                    ['categoryId' => $id]
                ));
            })->middleware('mwadmin.canFlag:category,allow_view')->name('mwadmin.category.view');
        });

        Route::middleware('mwadmin.can:subcategory')->group(function () use ($authProps): void {
            Route::get('/subcategory', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Subcategory/Index', $authProps($request));
            })->name('mwadmin.subcategory.index');

            Route::get('/subcategory/create', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Subcategory/Create', $authProps($request));
            })->middleware('mwadmin.canFlag:subcategory,allow_add')->name('mwadmin.subcategory.create');

            Route::get('/subcategory/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Subcategory/Edit', array_merge(
                    $authProps($request),
                    ['subcategoryId' => $id]
                ));
            })->middleware('mwadmin.canFlag:subcategory,allow_edit')->name('mwadmin.subcategory.edit');

            Route::get('/subcategory/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Subcategory/View', array_merge(
                    $authProps($request),
                    ['subcategoryId' => $id]
                ));
            })->middleware('mwadmin.canFlag:subcategory,allow_view')->name('mwadmin.subcategory.view');
        });

        Route::middleware('mwadmin.can:sponsorcategory')->group(function () use ($authProps): void {
            Route::get('/sponsorcategory', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Sponsorcategory/Index', $authProps($request));
            })->name('mwadmin.sponsorcategory.index');

            Route::get('/sponsorcategory/create', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Sponsorcategory/Create', $authProps($request));
            })->middleware('mwadmin.canFlag:sponsorcategory,allow_add')->name('mwadmin.sponsorcategory.create');

            Route::get('/sponsorcategory/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Sponsorcategory/Edit', array_merge(
                    $authProps($request),
                    ['sponsorcategoryId' => $id]
                ));
            })->middleware('mwadmin.canFlag:sponsorcategory,allow_edit')->name('mwadmin.sponsorcategory.edit');

            Route::get('/sponsorcategory/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Sponsorcategory/View', array_merge(
                    $authProps($request),
                    ['sponsorcategoryId' => $id]
                ));
            })->middleware('mwadmin.canFlag:sponsorcategory,allow_view')->name('mwadmin.sponsorcategory.view');
        });

        Route::middleware('mwadmin.can:users')->group(function () use ($authProps): void {
            Route::get('/users', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Users/Index', $authProps($request));
            })->name('mwadmin.users.index');

            Route::get('/users/create', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Users/Create', $authProps($request));
            })->middleware('mwadmin.canFlag:users,allow_add')->name('mwadmin.users.create');

            Route::get('/users/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Users/Edit', array_merge(
                    $authProps($request),
                    ['userId' => $id]
                ));
            })->middleware('mwadmin.canFlag:users,allow_edit')->name('mwadmin.users.edit');

            Route::get('/users/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Users/View', array_merge(
                    $authProps($request),
                    ['userId' => $id]
                ));
            })->middleware('mwadmin.canFlag:users,allow_view')->name('mwadmin.users.view');
        });

        Route::middleware('mwadmin.can:roles')->group(function () use ($authProps): void {
            Route::get('/roles', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Roles/Index', $authProps($request));
            })->name('mwadmin.roles.index');

            Route::get('/roles/create', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Roles/Create', $authProps($request));
            })->middleware('mwadmin.canFlag:roles,allow_add')->name('mwadmin.roles.create');

            Route::get('/roles/{id}/edit', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Roles/Edit', array_merge(
                    $authProps($request),
                    ['roleId' => $id]
                ));
            })->middleware('mwadmin.canFlag:roles,allow_edit')->name('mwadmin.roles.edit');

            Route::get('/roles/{id}/view', function (Request $request, int $id) use ($authProps) {
                return Inertia::render('Mwadmin/Roles/View', array_merge(
                    $authProps($request),
                    ['roleId' => $id]
                ));
            })->middleware('mwadmin.canFlag:roles,allow_view')->name('mwadmin.roles.view');
        });

        Route::middleware('mwadmin.can:newsletter')->group(function () use ($authProps): void {
            Route::get('/newsletter', function (Request $request) use ($authProps) {
                return Inertia::render('Mwadmin/Newsletter/Index', $authProps($request));
            })->name('mwadmin.newsletter.index');
        });

        Route::middleware('mwadmin.can:newslisting')->group(function () use ($authProps): void {
            Route::get('/newslisting', fn (Request $request) => Inertia::render('Mwadmin/Newslisting/Index', $authProps($request)))->name('mwadmin.newslisting.index');
            /** Continue “Add News” wizard (steps 2–6) on create URL after P2D save — same UI as edit, not `/edit/…`. */
            Route::get('/newslisting/create/{newslistingId}/{step?}', function (Request $request, int $newslistingId, ?string $step = null) use ($authProps) {
                $initial = 1;
                if ($step !== null && ctype_digit($step)) {
                    $n = (int) $step;
                    if ($n >= 1 && $n <= 5) {
                        $initial = $n;
                    }
                }

                return Inertia::render(
                    'Mwadmin/Newslisting/Create',
                    array_merge($authProps($request), [
                        'newslistingId' => $newslistingId,
                        'initialStep' => $initial,
                        'createWizard' => true,
                    ])
                );
            /** Same module access as listing; do not require `allow_edit` here — creators often only have `allow_add` after P2D save. */
            })->where(['step' => '[1-5]'])->name('mwadmin.newslisting.create.wizard');
            Route::get('/newslisting/create', fn (Request $request) => Inertia::render('Mwadmin/Newslisting/Create', $authProps($request)))->middleware('mwadmin.canFlag:newslisting,allow_add')->name('mwadmin.newslisting.create');
            Route::get('/newslisting/{id}/edit/{step?}', function (Request $request, int $id, ?string $step = null) use ($authProps) {
                $initial = 1;
                if ($step !== null && ctype_digit($step)) {
                    $n = (int) $step;
                    if ($n >= 1 && $n <= 5) {
                        $initial = $n;
                    }
                }

                return Inertia::render(
                    'Mwadmin/Newslisting/Edit',
                    array_merge($authProps($request), [
                        'newslistingId' => $id,
                        'initialStep' => $initial,
                    ])
                );
            })->where(['step' => '[1-5]'])->middleware('mwadmin.canFlag:newslisting,allow_edit')->name('mwadmin.newslisting.edit');
        });

        Route::middleware('mwadmin.can:schedule')->group(function () use ($authProps): void {
            Route::get('/schedule', fn (Request $request) => Inertia::render('Mwadmin/Schedule/Index', $authProps($request)))->name('mwadmin.schedule.index');
        });

        Route::middleware('mwadmin.can:newsource')->group(function () use ($authProps): void {
            Route::get('/newsource', fn (Request $request) => Inertia::render('Mwadmin/Newsource/Index', $authProps($request)))->name('mwadmin.newsource.index');
            Route::get('/newsource/create', fn (Request $request) => Inertia::render('Mwadmin/Newsource/Create', $authProps($request)))->middleware('mwadmin.canFlag:newsource,allow_add')->name('mwadmin.newsource.create');
            Route::get('/newsource/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Newsource/Edit', array_merge($authProps($request), ['newsourceId' => $id])))->middleware('mwadmin.canFlag:newsource,allow_edit')->name('mwadmin.newsource.edit');
        });

        Route::middleware('mwadmin.can:designation')->group(function () use ($authProps): void {
            Route::get('/designation', fn (Request $request) => Inertia::render('Mwadmin/Designation/Index', $authProps($request)))->name('mwadmin.designation.index');
            Route::get('/designation/create', fn (Request $request) => Inertia::render('Mwadmin/Designation/Create', $authProps($request)))->middleware('mwadmin.canFlag:designation,allow_add')->name('mwadmin.designation.create');
            Route::get('/designation/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Designation/Edit', array_merge($authProps($request), ['designationId' => $id])))->middleware('mwadmin.canFlag:designation,allow_edit')->name('mwadmin.designation.edit');
        });

        Route::middleware('mwadmin.can:sponsor')->group(function () use ($authProps): void {
            Route::get('/sponsor', fn (Request $request) => Inertia::render('Mwadmin/Sponsor/Index', $authProps($request)))->name('mwadmin.sponsor.index');
            Route::get('/sponsor/create', fn (Request $request) => Inertia::render('Mwadmin/Sponsor/Create', $authProps($request)))->middleware('mwadmin.canFlag:sponsor,allow_add')->name('mwadmin.sponsor.create');
            Route::get('/sponsor/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Sponsor/Edit', array_merge($authProps($request), ['sponsorId' => $id])))->middleware('mwadmin.canFlag:sponsor,allow_edit')->name('mwadmin.sponsor.edit');
            Route::get('/sponsor/{id}/view', fn (Request $request, int $id) => Inertia::render('Mwadmin/Sponsor/View', array_merge($authProps($request), ['sponsorId' => $id])))->middleware('mwadmin.canFlag:sponsor,allow_view')->name('mwadmin.sponsor.view');
        });

        Route::middleware('mwadmin.can:advertisement')->group(function () use ($authProps): void {
            Route::get('/advertisement', fn (Request $request) => Inertia::render('Mwadmin/Advertisement/Index', $authProps($request)))->name('mwadmin.advertisement.index');
            Route::get('/advertisement/create', fn (Request $request) => Inertia::render('Mwadmin/Advertisement/Create', $authProps($request)))->middleware('mwadmin.canFlag:advertisement,allow_add')->name('mwadmin.advertisement.create');
            Route::get('/advertisement/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Advertisement/Edit', array_merge($authProps($request), ['advertisementId' => $id])))->middleware('mwadmin.canFlag:advertisement,allow_edit')->name('mwadmin.advertisement.edit');
            Route::get('/advertisement/{id}/view', fn (Request $request, int $id) => Inertia::render('Mwadmin/Advertisement/View', array_merge($authProps($request), ['advertisementId' => $id])))->middleware('mwadmin.canFlag:advertisement,allow_view')->name('mwadmin.advertisement.view');
        });

        Route::middleware('mwadmin.can:flowchart')->group(function () use ($authProps): void {
            Route::get('/flowchart', fn (Request $request) => Inertia::render('Mwadmin/Flowchart/Index', $authProps($request)))->name('mwadmin.flowchart.index');
            Route::get('/flowchart/create', fn (Request $request) => Inertia::render('Mwadmin/Flowchart/Create', $authProps($request)))->middleware('mwadmin.canFlag:flowchart,allow_add')->name('mwadmin.flowchart.create');
            Route::get('/flowchart/{id}/edit', fn (Request $request, int $id) => Inertia::render('Mwadmin/Flowchart/Edit', array_merge($authProps($request), ['flowchartId' => $id])))->middleware('mwadmin.canFlag:flowchart,allow_edit')->name('mwadmin.flowchart.edit');
            Route::get('/flowchart/{id}/view', fn (Request $request, int $id) => Inertia::render('Mwadmin/Flowchart/View', array_merge($authProps($request), ['flowchartId' => $id])))->middleware('mwadmin.canFlag:flowchart,allow_view')->name('mwadmin.flowchart.view');
        });
    });
});
