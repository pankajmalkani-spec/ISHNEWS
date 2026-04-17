<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        $today = now()->format('Y-m-d');
        $now = now()->format('Y-m-d H:i:s');

        $categories = DB::table('categorymst')
            ->selectRaw('id, title, sort, LOWER(code) as code, qty, box_img')
            ->where('status', 1)
            ->orderBy('sort')
            ->get();

        // Fallback for environments where status flags are not maintained.
        if ($categories->isEmpty()) {
            $categories = DB::table('categorymst')
                ->selectRaw('id, title, sort, LOWER(code) as code, qty, box_img')
                ->orderBy('sort')
                ->get();
        }

        $categorySections = [];
        $menu = [];
        foreach ($categories as $cat) {
            $catId = (int) $cat->id;
            $qty = max(1, (int) ($cat->qty ?? 3));

            $newsList = DB::table('contenttrans as a')
                ->leftJoin('categorymst as c', 'c.id', '=', 'a.category_id')
                ->leftJoin('subcategorymst as sc', 'a.subcategory_id', '=', 'sc.id')
                ->leftJoin('newsource as ns', 'a.news_source', '=', 'ns.id')
                ->selectRaw(
                    'a.id, a.cover_img, a.title, a.seo_keyword, a.description, a.schedule_date, LOWER(a.permalink) as permalink, LOWER(c.code) as categorycode, c.title as categoryname, LOWER(sc.subcat_code) as subcategorycode, sc.name as subcategoryname, ns.name as newsourcename'
                )
                ->where('c.id', $catId)
                ->where('a.final_releasestatus', 1)
                ->where('a.featured_content', 0)
                ->where('a.schedule_date', '<=', $now)
                ->orderByDesc('a.schedule_date')
                ->limit($qty)
                ->get();

            if ($newsList->isNotEmpty()) {
                $categorySections[] = [
                    'id' => $catId,
                    'code' => (string) $cat->code,
                    'title' => (string) $cat->title,
                    'sort' => (int) $cat->sort,
                    'news_list' => $newsList,
                ];
            }

            $subcategories = DB::table('subcategorymst')
                ->selectRaw('id, name, LOWER(subcat_code) as code')
                ->where('status', 1)
                ->where('category_id', $catId)
                ->orderBy('sort')
                ->get();

            $latest = DB::table('contenttrans as ct')
                ->leftJoin('categorymst as c', 'c.id', '=', 'ct.category_id')
                ->leftJoin('subcategorymst as sc', 'ct.subcategory_id', '=', 'sc.id')
                ->selectRaw('ct.id, ct.subcategory_id, ct.cover_img, ct.title as content_title, ct.schedule_date, LOWER(ct.permalink) as permalink, LOWER(c.code) as categorycode, LOWER(sc.subcat_code) as subcatcode, sc.name as subcatname')
                ->where('ct.category_id', $catId)
                ->where('ct.final_releasestatus', 1)
                ->whereDate('ct.schedule_date', '<=', $today)
                ->orderByDesc('ct.schedule_date')
                // Keep a bigger set so subcategory filtering has visible cards.
                ->limit(40)
                ->get();

            $menu[] = [
                'id' => $catId,
                'title' => (string) $cat->title,
                'code' => (string) $cat->code,
                'subcategories' => $subcategories,
                'latest' => $latest,
            ];
        }

        $cslider = DB::table('sponsormst as s')
            ->leftJoin('sponsorcategory as sc', 's.sponsorcategory_id', '=', 'sc.id')
            ->selectRaw('s.organization_name, s.logo, s.website, sc.name as package')
            ->where('s.status', 1)
            ->where(function ($q) use ($today): void {
                $q->whereIn(DB::raw('CAST(s.start_date AS CHAR(10))'), ['1970-01-01', '0000-00-00'])
                    ->orWhere(function ($q2) use ($today): void {
                        $q2->whereRaw("CAST(s.start_date AS CHAR(10)) <= ?", [$today])
                            ->whereRaw("CAST(s.end_date AS CHAR(10)) >= ?", [$today]);
                    });
            })
            ->orderBy('sc.sort')
            ->orderByDesc('s.start_date')
            ->get();

        $advertisement = DB::table('advertisement')
            ->select('id', 'title', 'img_url', 'annual_rates')
            ->where('status', 1)
            ->whereRaw("CAST(start_date AS CHAR(10)) <= ?", [$today])
            ->whereRaw("CAST(end_date AS CHAR(10)) >= ?", [$today])
            ->orderByDesc('annual_rates')
            ->limit(3)
            ->get();

        $banner = DB::table('contenttrans as a')
            ->leftJoin('categorymst as c', 'c.id', '=', 'a.category_id')
            ->leftJoin('subcategorymst as sc', 'a.subcategory_id', '=', 'sc.id')
            ->leftJoin('newsource as ns', 'a.news_source', '=', 'ns.id')
            ->selectRaw('a.id, a.cover_img, a.title, a.seo_keyword, a.schedule_date, LOWER(a.permalink) as permalink, LOWER(c.code) as categorycode, c.title as categoryname, LOWER(sc.subcat_code) as subcategorycode, sc.name as subcategoryname, ns.name as newsourcename')
            ->where('a.final_releasestatus', 1)
            ->where('a.featured_content', 1)
            ->where('a.schedule_date', '<=', $now)
            ->orderByDesc('a.schedule_date')
            ->limit(8)
            ->get();

        $quotes = DB::table('quotes')->select('quote', 'author')->where('status', 1)->get();

        // Last-resort fallback from visible content categories so top nav never disappears.
        if (count($menu) === 0) {
            $contentCats = DB::table('contenttrans as ct')
                ->leftJoin('categorymst as c', 'c.id', '=', 'ct.category_id')
                ->selectRaw('c.id, c.title, LOWER(c.code) as code')
                ->whereNotNull('c.id')
                ->where('ct.final_releasestatus', 1)
                ->where('ct.schedule_date', '<=', $now)
                ->distinct()
                ->orderBy('c.title')
                ->get();

            foreach ($contentCats as $c) {
                $menu[] = [
                    'id' => (int) $c->id,
                    'title' => (string) ($c->title ?? ''),
                    'code' => (string) ($c->code ?? ''),
                    'subcategories' => [],
                    'latest' => [],
                ];
            }
        }

        $CategorySet1 = [];
        foreach ($categorySections as $section) {
            $sort = (int) ($section['sort'] ?? 0);
            if ($sort <= 0) {
                continue;
            }
            $CategorySet1[$sort] = $section;
        }
        ksort($CategorySet1);

        $marqueestr = '';
        if ($quotes->count() > 0) {
            $marqueestr = '<marquee>';
            foreach ($quotes as $q) {
                $marqueestr .= ($q->quote ?? '').' ~ '.($q->author ?? '').'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
            }
            $marqueestr .= '</marquee>';
        }

        return view('frontend.home', [
            'menu' => $menu,
            'CategorySet1' => $CategorySet1,
            'cslider' => $cslider,
            'advertisement' => $advertisement,
            'banner' => $banner,
            'quote' => $marqueestr,
        ]);
    }
}

