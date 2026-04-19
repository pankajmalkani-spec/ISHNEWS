<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use App\Services\FrontendSharedViewData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class VideoController extends Controller
{
    public function show(Request $request, string $categoryCode, string $permalink): View|JsonResponse
    {
        $news = $this->resolvePublishedVideo($categoryCode, $permalink);
        if ($news === null) {
            throw new NotFoundHttpException;
        }

        $recentNews = $this->recentNewsForCategory((string) ($news->categorycode ?? ''));

        $pageTitle = (string) ($news->title ?? 'Video');
        $pageDescription = strip_tags((string) ($news->description ?? ''));

        $nav = FrontendSharedViewData::navigationMenuOnly();

        if ($this->wantsVideoFragment($request)) {
            return response()->json([
                'title' => $pageTitle.' | ISH News',
                'html_main' => view('frontend.partials.video_show_main', [
                    'news' => $news,
                ])->render(),
                'html_sidebar' => view('frontend.partials.video_sidebar_recent', [
                    'recentNews' => $recentNews,
                ])->render(),
            ]);
        }

        return view('frontend.video_show', array_merge($nav, [
            'cslider' => FrontendSharedViewData::sponsorCarousel(),
            'news' => $news,
            'recentNews' => $recentNews,
            'pageTitle' => $pageTitle,
            'pageDescription' => $pageDescription,
        ]));
    }

    /**
     * @return object|null  Row with categorycode, article_content, news fields
     */
    private function resolvePublishedVideo(string $categoryCode, string $permalink): ?object
    {
        $now = now()->format('Y-m-d H:i:s');
        $categoryLower = strtolower($categoryCode);
        $permalinkLower = strtolower(rawurldecode($permalink));

        return DB::table('contenttrans as a')
            ->leftJoin('categorymst as c', 'c.id', '=', 'a.category_id')
            ->leftJoin('subcategorymst as sc', 'a.subcategory_id', '=', 'sc.id')
            ->leftJoin('newsource as ns', 'a.news_source', '=', 'ns.id')
            ->leftJoin('textarticle as txt', 'a.id', '=', 'txt.edited_id')
            ->where('a.final_releasestatus', 1)
            ->where('a.schedule_date', '<=', $now)
            ->whereRaw('LOWER(c.code) = ?', [$categoryLower])
            ->whereRaw('LOWER(a.permalink) = ?', [$permalinkLower])
            ->selectRaw(
                'a.id, a.cover_img, a.title, a.description, a.seo_keyword, a.schedule_date, a.permalink, a.youtube_url, a.youtube_video, a.youtube_subtitles, a.youtube_url_check, '.
                'LOWER(c.code) as categorycode, c.title as categoryname, '.
                'LOWER(sc.subcat_code) as subcategorycode, sc.name as subcategoryname, ns.name as newsourcename, '.
                'txt.article_content as article_content'
            )
            ->first();
    }

    /**
     * @return \Illuminate\Support\Collection<int, object>
     */
    private function recentNewsForCategory(string $categoryCode): \Illuminate\Support\Collection
    {
        $now = now()->format('Y-m-d H:i:s');
        $q = DB::table('contenttrans as a')
            ->leftJoin('categorymst as c', 'c.id', '=', 'a.category_id')
            ->leftJoin('subcategorymst as sc', 'a.subcategory_id', '=', 'sc.id')
            ->leftJoin('newsource as ns', 'a.news_source', '=', 'ns.id')
            ->where('a.final_releasestatus', 1)
            ->where(function ($q): void {
                $q->where('a.featured_content', 0)->orWhereNull('a.featured_content');
            })
            ->where('a.schedule_date', '<=', $now)
            ->selectRaw(
                'a.id, a.cover_img, a.title, a.seo_keyword, a.schedule_date, LOWER(a.permalink) as permalink, '.
                'LOWER(c.code) as categorycode, c.title as categoryname, LOWER(sc.subcat_code) as subcategorycode, sc.name as subcategoryname, ns.name as newsourcename'
            )
            ->orderByDesc('a.schedule_date')
            ->limit(5);

        if ($categoryCode !== '') {
            $q->whereRaw('LOWER(c.code) = ?', [strtolower($categoryCode)]);
        }

        return $q->get();
    }

    private function wantsVideoFragment(Request $request): bool
    {
        if ($request->query('fragment') !== '1') {
            return false;
        }

        return $request->ajax()
            || $request->wantsJson()
            || $request->header('X-Video-Fragment') === '1';
    }
}
