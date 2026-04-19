<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use App\Services\FrontendSharedViewData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CategoryController extends Controller
{
    private const PER_PAGE = 12;

    public function show(Request $request, string $categoryCode, ?string $subcategoryCode = null): View
    {
        $categoryCodeLower = strtolower($categoryCode);

        $category = DB::table('categorymst')
            ->selectRaw('id, title, description, box_img, banner_img, LOWER(code) as code')
            ->whereRaw('LOWER(code) = ?', [$categoryCodeLower])
            ->where('status', 1)
            ->first();

        if ($category === null) {
            throw new NotFoundHttpException;
        }

        $subcategories = DB::table('subcategorymst')
            ->selectRaw('id, name as subcategoryname, description, LOWER(subcat_code) as code')
            ->where('category_id', (int) $category->id)
            ->where('status', 1)
            ->orderBy('sort')
            ->get();

        $activeSub = null;
        if ($subcategoryCode !== null && $subcategoryCode !== '') {
            $subLower = strtolower($subcategoryCode);
            $activeSub = $subcategories->first(function ($s) use ($subLower) {
                return strtolower((string) $s->code) === $subLower;
            });
            if ($activeSub === null) {
                throw new NotFoundHttpException;
            }
        }

        $subId = $activeSub !== null ? (int) $activeSub->id : null;
        $base = $this->categoryVideosQuery((int) $category->id, $subId);
        $total = (clone $base)->count();
        $videos = (clone $base)
            ->orderByDesc('ct.schedule_date')
            ->offset(0)
            ->limit(self::PER_PAGE)
            ->get();
        $hasMore = $total > self::PER_PAGE;

        $pageTitle = (string) $category->title;
        $pageDescription = (string) ($category->description ?? '');
        if ($activeSub !== null) {
            $pageTitle = $pageTitle.' : '.$activeSub->subcategoryname;
            $subDesc = trim(strip_tags((string) ($activeSub->description ?? '')));
            if ($subDesc !== '') {
                $pageDescription = $subDesc;
            }
        }

        $nav = FrontendSharedViewData::navigationMenuOnly();

        return view('frontend.category_listing', array_merge($nav, [
            'cslider' => FrontendSharedViewData::sponsorCarousel(),
            'category' => $category,
            'allsubcategories' => $subcategories,
            'activeSubcategoryCode' => $activeSub !== null ? strtolower((string) $activeSub->code) : '',
            'activeSubcategoryName' => $activeSub !== null ? (string) $activeSub->subcategoryname : '',
            'videos' => $videos,
            'hasMore' => $hasMore,
            'nextPage' => 2,
            'pageTitle' => $pageTitle,
            'pageDescription' => $pageDescription,
        ]));
    }

    public function loadMore(Request $request, string $categoryCode): JsonResponse
    {
        $page = max(2, (int) $request->query('page', 2));
        $subcategoryCode = $request->query('subcategory');
        $subcategoryCode = is_string($subcategoryCode) && $subcategoryCode !== '' ? $subcategoryCode : null;

        $categoryCodeLower = strtolower($categoryCode);

        $category = DB::table('categorymst')
            ->selectRaw('id, title, description, box_img, banner_img, LOWER(code) as code')
            ->whereRaw('LOWER(code) = ?', [$categoryCodeLower])
            ->where('status', 1)
            ->first();

        if ($category === null) {
            throw new NotFoundHttpException;
        }

        $subcategories = DB::table('subcategorymst')
            ->selectRaw('id, name as subcategoryname, description, LOWER(subcat_code) as code')
            ->where('category_id', (int) $category->id)
            ->where('status', 1)
            ->orderBy('sort')
            ->get();

        $activeSub = null;
        if ($subcategoryCode !== null) {
            $subLower = strtolower($subcategoryCode);
            $activeSub = $subcategories->first(function ($s) use ($subLower) {
                return strtolower((string) $s->code) === $subLower;
            });
            if ($activeSub === null) {
                throw new NotFoundHttpException;
            }
        }

        $subId = $activeSub !== null ? (int) $activeSub->id : null;
        $base = $this->categoryVideosQuery((int) $category->id, $subId);
        $total = (clone $base)->count();
        $offset = ($page - 1) * self::PER_PAGE;
        $videos = (clone $base)
            ->orderByDesc('ct.schedule_date')
            ->offset($offset)
            ->limit(self::PER_PAGE)
            ->get();

        $loadedThrough = $offset + $videos->count();
        $hasMore = $loadedThrough < $total;

        return response()->json([
            'html' => view('frontend.partials.category_video_cards', ['videos' => $videos])->render(),
            'has_more' => $hasMore,
            'next_page' => $page + 1,
        ]);
    }

    private function categoryVideosQuery(int $categoryId, ?int $subcategoryId): \Illuminate\Database\Query\Builder
    {
        $now = now()->format('Y-m-d H:i:s');

        $query = DB::table('contenttrans as ct')
            ->leftJoin('categorymst as c', 'c.id', '=', 'ct.category_id')
            ->leftJoin('subcategorymst as sc', 'ct.subcategory_id', '=', 'sc.id')
            ->leftJoin('newsource as ns', 'ct.news_source', '=', 'ns.id')
            ->selectRaw(
                'ct.id, ct.cover_img, ct.title, ct.description, ct.schedule_date, ct.seo_keyword, LOWER(ct.permalink) as permalink, LOWER(c.code) as categorycode, LOWER(sc.subcat_code) as subcategorycode, sc.name as subcategoryname, ns.name as newsourcename'
            )
            ->where('c.id', $categoryId)
            ->where('ct.final_releasestatus', 1)
            ->where('ct.schedule_date', '<=', $now);

        if ($subcategoryId !== null) {
            $query->where('ct.subcategory_id', $subcategoryId);
        }

        return $query;
    }
}
