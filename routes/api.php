<?php

use App\Http\Controllers\Mwadmin\AdvertisementApiController;
use App\Http\Controllers\Mwadmin\AuthController;
use App\Http\Controllers\Mwadmin\CategoryApiController;
use App\Http\Controllers\Mwadmin\DashboardApiController;
use App\Http\Controllers\Mwadmin\DesignationApiController;
use App\Http\Controllers\Mwadmin\FlowchartApiController;
use App\Http\Controllers\Mwadmin\NewsletterApiController;
use App\Http\Controllers\Mwadmin\NewslistingApiController;
use App\Http\Controllers\Mwadmin\NewsourceApiController;
use App\Http\Controllers\Mwadmin\ProfileApiController;
use App\Http\Controllers\Mwadmin\RolesApiController;
use App\Http\Controllers\Mwadmin\ScheduleApiController;
use App\Http\Controllers\Mwadmin\SponsorCategoryApiController;
use App\Http\Controllers\Mwadmin\SponsorMstApiController;
use App\Http\Controllers\Mwadmin\SubcategoryApiController;
use App\Http\Controllers\Mwadmin\UsersApiController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->prefix('mwadmin')->group(function (): void {
    Route::post('/login', [AuthController::class, 'loginApi'])->name('api.mwadmin.login');
    Route::middleware('mwadmin.auth')->group(function (): void {
        Route::get('/me', [AuthController::class, 'meApi'])->name('api.mwadmin.me');
        Route::post('/logout', [AuthController::class, 'logoutApi'])->name('api.mwadmin.logout');

        Route::get('/profile', [ProfileApiController::class, 'show'])->name('api.mwadmin.profile.show');
        Route::put('/profile', [ProfileApiController::class, 'update'])->name('api.mwadmin.profile.update');
        Route::post('/profile/password', [ProfileApiController::class, 'updatePassword'])->name('api.mwadmin.profile.password');

        Route::middleware('mwadmin.can:dashboard')->group(function (): void {
            Route::get('/dashboard/options', [DashboardApiController::class, 'options'])->name('api.mwadmin.dashboard.options');
            Route::get('/dashboard/rows', [DashboardApiController::class, 'index'])->name('api.mwadmin.dashboard.rows');
        });

        Route::middleware('mwadmin.can:category')->group(function (): void {
            Route::get('/categories/verify-sort', [CategoryApiController::class, 'verifySort'])->name('api.mwadmin.categories.verify-sort');
            Route::apiResource('/categories', CategoryApiController::class);
        });

        Route::middleware('mwadmin.can:subcategory')->group(function (): void {
            Route::get('/subcategories/verify-sort', [SubcategoryApiController::class, 'verifySort'])->name('api.mwadmin.subcategories.verify-sort');
            Route::get('/subcategories/options', [SubcategoryApiController::class, 'options'])->name('api.mwadmin.subcategories.options');
            Route::apiResource('/subcategories', SubcategoryApiController::class);
        });

        Route::middleware('mwadmin.can:sponsorcategory')->group(function (): void {
            Route::apiResource('/sponsorcategories', SponsorCategoryApiController::class);
        });

        Route::middleware('mwadmin.can:roles')->group(function (): void {
            Route::get('/roles/options', [RolesApiController::class, 'options'])->name('api.mwadmin.roles.options');
            Route::apiResource('/roles', RolesApiController::class);
        });

        Route::middleware('mwadmin.can:users')->group(function (): void {
            Route::get('/users/options', [UsersApiController::class, 'options'])->name('api.mwadmin.users.options');
            Route::post('/users/{id}/reset-password', [UsersApiController::class, 'resetPassword'])->name('api.mwadmin.users.reset-password');
            Route::apiResource('/users', UsersApiController::class);
        });

        Route::middleware('mwadmin.can:newsletter')->group(function (): void {
            Route::get('/newsletters', [NewsletterApiController::class, 'index'])->name('api.mwadmin.newsletters.index');
            Route::post('/newsletters/export', [NewsletterApiController::class, 'export'])->name('api.mwadmin.newsletters.export');
            Route::delete('/newsletters/{id}', [NewsletterApiController::class, 'destroy'])->name('api.mwadmin.newsletters.destroy');
        });

        Route::middleware('mwadmin.can:newslisting')->group(function (): void {
            Route::get('/newslistings/options', [NewslistingApiController::class, 'options'])->name('api.mwadmin.newslistings.options');
            Route::get('/newslistings/next-meta', [NewslistingApiController::class, 'nextMeta'])->name('api.mwadmin.newslistings.next-meta');
            Route::put('/newslistings/{id}/text-article', [NewslistingApiController::class, 'updateTextArticle'])->name('api.mwadmin.newslistings.text-article');
            Route::get('/newslistings/{id}/checklist', [NewslistingApiController::class, 'checklist'])->name('api.mwadmin.newslistings.checklist');
            Route::post('/newslistings/{id}/checklist/preview', [NewslistingApiController::class, 'previewChecklistTemplate'])->name('api.mwadmin.newslistings.checklist.preview');
            Route::put('/newslistings/{id}/checklist', [NewslistingApiController::class, 'saveChecklist'])->name('api.mwadmin.newslistings.checklist.save');
            Route::get('/newslistings/{id}/reviews', [NewslistingApiController::class, 'reviews'])->name('api.mwadmin.newslistings.reviews');
            Route::post('/newslistings/{id}/reviews', [NewslistingApiController::class, 'storeReview'])->name('api.mwadmin.newslistings.reviews.store');
            Route::apiResource('/newslistings', NewslistingApiController::class)->parameters(['newslistings' => 'id']);
        });

        Route::middleware('mwadmin.can:schedule')->group(function (): void {
            Route::get('/schedule/week', [ScheduleApiController::class, 'week'])->name('api.mwadmin.schedule.week');
            Route::get('/schedule/content/{id}', [ScheduleApiController::class, 'content'])->name('api.mwadmin.schedule.content');
            Route::post('/schedule/update-status', [ScheduleApiController::class, 'updateStatus'])->name('api.mwadmin.schedule.update-status');
        });

        Route::middleware('mwadmin.can:newsource')->group(function (): void {
            Route::apiResource('/newsources', NewsourceApiController::class)->parameters(['newsources' => 'id']);
        });

        Route::middleware('mwadmin.can:designation')->group(function (): void {
            Route::apiResource('/designations', DesignationApiController::class)->parameters(['designations' => 'id']);
        });

        Route::middleware('mwadmin.can:sponsor')->group(function (): void {
            Route::apiResource('/sponsors', SponsorMstApiController::class)->parameters(['sponsors' => 'id']);
        });

        Route::middleware('mwadmin.can:advertisement')->group(function (): void {
            Route::get('/advertisements/options', [AdvertisementApiController::class, 'options'])->name('api.mwadmin.advertisements.options');
            Route::apiResource('/advertisements', AdvertisementApiController::class)->parameters(['advertisements' => 'id']);
        });

        Route::middleware('mwadmin.can:flowchart')->group(function (): void {
            Route::get('/flowcharts/options', [FlowchartApiController::class, 'options'])->name('api.mwadmin.flowcharts.options');
            Route::apiResource('/flowcharts', FlowchartApiController::class)->parameters(['flowcharts' => 'id']);
        });
    });
});
