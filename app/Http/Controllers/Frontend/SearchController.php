<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use App\Services\FrontendSharedViewData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class SearchController extends Controller
{
    public function index(Request $request): View
    {
        $keyword = trim((string) $request->query('sKeyword', $request->query('keyword', '')));
        $now = now()->format('Y-m-d H:i:s');

        $results = collect();
        if ($keyword !== '') {
            $like = '%'.addcslashes($keyword, '%_\\').'%';
            $results = DB::table('contenttrans as ct')
                ->leftJoin('categorymst as c', 'c.id', '=', 'ct.category_id')
                ->leftJoin('subcategorymst as sc', 'ct.subcategory_id', '=', 'sc.id')
                ->leftJoin('newsource as ns', 'ct.news_source', '=', 'ns.id')
                ->selectRaw('ct.cover_img, ct.title, ct.description, ct.seo_keyword, ct.schedule_date, LOWER(ct.permalink) as permalink, LOWER(c.code) as categorycode, LOWER(sc.subcat_code) as subcategorycode, sc.name as subcategoryname, ns.name as newsourcename')
                ->where('ct.final_releasestatus', 1)
                ->where('ct.schedule_date', '<=', $now)
                ->where(function ($q) use ($like): void {
                    $q->where('ct.title', 'like', $like)
                        ->orWhere('ct.description', 'like', $like)
                        ->orWhere('ct.seo_keyword', 'like', $like);
                })
                ->orderByDesc('ct.schedule_date')
                ->limit(50)
                ->get();
        }

        $nav = FrontendSharedViewData::navigationMenuOnly();

        return view('frontend.search', array_merge($nav, [
            'cslider' => FrontendSharedViewData::sponsorCarousel(),
            'results' => $results,
            'keyword' => $keyword,
        ]));
    }
}
