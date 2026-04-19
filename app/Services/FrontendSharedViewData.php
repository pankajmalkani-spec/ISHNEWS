<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Shared navigation / homepage data so inner pages reuse the same mega-menu as the home page.
 */
final class FrontendSharedViewData
{
    /**
     * @return array{menu: array<int, array<string, mixed>>}
     */
    public static function navigationMenuOnly(): array
    {
        $today = now()->format('Y-m-d');
        $now = now()->format('Y-m-d H:i:s');

        $categories = DB::table('categorymst')
            ->selectRaw('id, title, sort, LOWER(code) as code, qty, box_img')
            ->where('status', 1)
            ->orderBy('sort')
            ->get();

        if ($categories->isEmpty()) {
            $categories = DB::table('categorymst')
                ->selectRaw('id, title, sort, LOWER(code) as code, qty, box_img')
                ->orderBy('sort')
                ->get();
        }

        $menu = [];
        foreach ($categories as $cat) {
            $catId = (int) $cat->id;

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
                    'subcategories' => collect(),
                    'latest' => collect(),
                ];
            }
        }

        return ['menu' => $menu];
    }

    public static function sponsorCarousel(): Collection
    {
        $today = now()->format('Y-m-d');

        return DB::table('sponsormst as s')
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
    }

    /**
     * Categories with subcategories for the sitemap page (legacy get_category / get_subcategory).
     *
     * @return \Illuminate\Support\Collection<int, object>
     */
    public static function sitemapCategories(): Collection
    {
        $categories = DB::table('categorymst')
            ->selectRaw('id, title, LOWER(code) as code')
            ->where('status', 1)
            ->orderBy('sort')
            ->get();

        if ($categories->isEmpty()) {
            $categories = DB::table('categorymst')
                ->selectRaw('id, title, LOWER(code) as code')
                ->orderBy('sort')
                ->get();
        }

        return $categories->map(function ($cat) {
            $subs = DB::table('subcategorymst')
                ->selectRaw('id, name, LOWER(subcat_code) as code')
                ->where('status', 1)
                ->where('category_id', (int) $cat->id)
                ->orderBy('sort')
                ->get();

            return (object) [
                'id' => $cat->id,
                'title' => $cat->title,
                'code' => $cat->code,
                'subcategories' => $subs,
            ];
        });
    }
}
