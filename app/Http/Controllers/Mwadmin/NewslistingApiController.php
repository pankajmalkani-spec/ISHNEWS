<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Mwadmin\Concerns\AuthorizesMwadminPermissions;
use App\Http\Controllers\Mwadmin\Concerns\ResolvesMwadminUser;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;

class NewslistingApiController extends Controller
{
    use AuthorizesMwadminPermissions;
    use ResolvesMwadminUser;

    /** @var list<string> */
    private const STATUS_DRAFT = ['Pending', 'WIP', 'Ready', 'Issue', 'Dropped', 'Hold'];

    public function options(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newslisting', 'allow_view')) {
            return $deny;
        }

        $categoryId = (int) $request->query('category_id', 0);
        $categories = DB::table('categorymst')->select('id', 'title')->where('status', 1)->orderBy('title')->get();
        $newsSources = DB::table('newsource')->select('id', 'name')->where('status', 1)->orderBy('name')->get();
        $subcategories = $categoryId > 0
            ? DB::table('subcategorymst')->select('id', 'name', 'category_id')->where('category_id', $categoryId)->where('status', 1)->orderBy('name')->get()
            : [];

        $nextId = (int) (DB::table('contenttrans')->max('id') ?? 0) + 1;

        return response()->json([
            'categories' => $categories,
            'news_sources' => $newsSources,
            'subcategories' => $subcategories,
            'suggested_next_id' => $nextId,
        ]);
    }

    public function nextMeta(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newslisting', 'allow_view')) {
            return $deny;
        }

        $validated = $request->validate([
            'category_id' => ['required', 'integer', 'exists:categorymst,id'],
        ]);
        $categoryId = (int) $validated['category_id'];
        $maxSerial = (int) (DB::table('contenttrans')->where('category_id', $categoryId)->max('last_serialno') ?? 0);
        $lastSerial = $maxSerial > 0 ? $maxSerial + 1 : 1;
        $catCode = (string) (DB::table('categorymst')->where('id', $categoryId)->value('code') ?? '');
        $nextId = (int) (DB::table('contenttrans')->max('id') ?? 0) + 1;

        return response()->json([
            'last_serialno' => $lastSerial,
            'cat_code' => $catCode,
            'suggested_p2d_caseno' => (string) $nextId,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newslisting', 'allow_view')) {
            return $deny;
        }

        $perPageParam = (string) $request->query('per_page', '10');
        $allRows = strtolower($perPageParam) === 'all';
        $perPage = $allRows ? 100000 : max(1, min((int) $perPageParam, 100));
        $search = trim((string) $request->query('search', ''));
        $filterCategory = trim((string) $request->query('filter_category_id', ''));
        $filterSubcategory = trim((string) $request->query('filter_subcategory_id', ''));
        $filterStatus = trim((string) $request->query('filter_status1', ''));
        $filterFeatured = trim((string) $request->query('filter_featured', ''));
        $filterTitle = trim((string) $request->query('filter_title', ''));

        $query = DB::table('contenttrans as ct')
            ->leftJoin('categorymst as cm', 'cm.id', '=', 'ct.category_id')
            ->leftJoin('subcategorymst as scm', 'scm.id', '=', 'ct.subcategory_id')
            ->leftJoin('newsource as ns', 'ns.id', '=', 'ct.news_source')
            ->selectRaw(
                'ct.id, ct.p2d_caseno, ct.category_id, ct.subcategory_id, ct.banner_img, ct.cover_img, ct.title, ct.permalink, ct.status1, ct.featured_content, ct.final_releasestatus, ct.schedule_date, ns.name as news_source_name, cm.title as category_name, scm.name as subcategory_name'
            );

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('ct.title', 'like', "%{$search}%")
                    ->orWhere('ct.p2d_caseno', 'like', "%{$search}%");
            });
        }
        if ($filterTitle !== '') {
            $query->where('ct.title', 'like', "%{$filterTitle}%");
        }
        if ($filterCategory !== '' && ctype_digit($filterCategory)) {
            $query->where('ct.category_id', (int) $filterCategory);
        }
        if ($filterSubcategory !== '' && ctype_digit($filterSubcategory)) {
            $query->where('ct.subcategory_id', (int) $filterSubcategory);
        }
        if ($filterStatus !== '') {
            $query->where('ct.status1', $filterStatus);
        }
        if ($filterFeatured === '1' || $filterFeatured === '0') {
            $query->where('ct.featured_content', $filterFeatured);
        }

        $paginator = $query->orderByDesc('ct.id')->paginate($perPage)->withQueryString();
        $collection = collect($paginator->items())->map(fn ($item) => $this->transformListItem((array) $item))->values();

        return response()->json([
            'data' => $collection,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newslisting', 'allow_view')) {
            return $deny;
        }

        $row = DB::table('contenttrans as ct')
            ->leftJoin('categorymst as cm', 'cm.id', '=', 'ct.category_id')
            ->leftJoin('subcategorymst as scm', 'scm.id', '=', 'ct.subcategory_id')
            ->leftJoin('newsource as ns', 'ns.id', '=', 'ct.news_source')
            ->leftJoin('textarticle as ta', 'ta.edited_id', '=', 'ct.id')
            ->where('ct.id', $id)
            ->selectRaw(
                'ct.*, cm.title as category_name, scm.name as subcategory_name, ns.name as news_source_name, ta.article_content as article_content'
            )
            ->first();

        if (! $row) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json(['data' => $this->transformRecord((array) $row)]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newslisting', 'allow_add')) {
            return $deny;
        }

        $validated = $this->validateContent($request, null);
        $this->assertUniqueTitleAndPermalink($validated['title'], $validated['permalink'], null);

        [$status1, $scheduleDate] = $this->resolveStatusAndSchedule($request);
        $userId = $this->resolveRealUserId($request);
        $now = now();

        $featured = ! empty($validated['featured_content']) ? '1' : '0';
        $compDate = $this->parseDateOrEmpty($validated['completion_date'] ?? null);

        $bannerName = $request->hasFile('banner_img') ? $this->storeNewsImage($request->file('banner_img'), 'banner') : '';
        $coverName = $request->hasFile('cover_img') ? $this->storeNewsImage($request->file('cover_img'), 'cover') : '';

        $payload = [
            'category_id' => (int) $validated['category_id'],
            'subcategory_id' => (int) $validated['subcategory_id'],
            'permalink' => ucwords($validated['permalink']),
            'status1' => $status1,
            'title' => $validated['title'],
            'seo_keyword' => $validated['seo_keyword'],
            'featured_content' => $featured,
            'news_source' => (int) $validated['news_source'],
            'shared_folder' => $validated['shared_folder'] ?? '',
            'last_serialno' => (int) $validated['last_serialno'],
            'p2d_caseno' => strtoupper($validated['p2d_caseno']),
            'p2d_date' => $this->parseDateTimeStartOfDay($validated['p2d_date']),
            'description' => $validated['description'] !== null && $validated['description'] !== ''
                ? ucfirst($validated['description'])
                : ($validated['description'] ?? ''),
            'schedule_date' => $scheduleDate ?? '',
            'due_date' => $this->parseDateTimeStartOfDay($validated['due_date']),
            'completion_date' => $compDate,
            'prepared_by' => $validated['prepared_by'],
            'authorized_by' => $validated['authorized_by'],
            'banner_img' => $bannerName,
            'cover_img' => $coverName,
            'addeddate' => $now,
            'addedby' => $userId,
            'final_releasestatus' => $status1 === 'Released' ? '1' : '0',
        ];

        $id = DB::table('contenttrans')->insertGetId($payload);

        return response()->json([
            'message' => 'News content created successfully.',
            'data' => ['id' => $id],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newslisting', 'allow_edit')) {
            return $deny;
        }

        $existing = DB::table('contenttrans')->where('id', $id)->first();
        if (! $existing) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $validated = $this->validateContent($request, $id);
        $this->assertUniqueTitleAndPermalink($validated['title'], $validated['permalink'], $id);

        [$status1, $scheduleDate] = $this->resolveStatusAndSchedule($request);
        $userId = $this->resolveRealUserId($request);
        $now = now();

        $featured = ! empty($validated['featured_content']) ? '1' : '0';
        $compDate = $this->parseDateOrEmpty($validated['completion_date'] ?? null);

        $bannerName = (string) ($existing->banner_img ?? '');
        $coverName = (string) ($existing->cover_img ?? '');

        if ($request->hasFile('banner_img')) {
            $this->deleteNewsImageIfExists($bannerName, 'banner');
            $bannerName = $this->storeNewsImage($request->file('banner_img'), 'banner');
        }
        if ($request->hasFile('cover_img')) {
            $this->deleteNewsImageIfExists($coverName, 'cover');
            $coverName = $this->storeNewsImage($request->file('cover_img'), 'cover');
        }

        $payload = [
            'category_id' => (int) $validated['category_id'],
            'subcategory_id' => (int) $validated['subcategory_id'],
            'permalink' => ucwords($validated['permalink']),
            'status1' => $status1,
            'title' => $validated['title'],
            'seo_keyword' => $validated['seo_keyword'],
            'featured_content' => $featured,
            'news_source' => (int) $validated['news_source'],
            'shared_folder' => $validated['shared_folder'] ?? '',
            'description' => $validated['description'] !== null && $validated['description'] !== ''
                ? ucfirst($validated['description'])
                : ($validated['description'] ?? ''),
            'schedule_date' => $scheduleDate ?? (string) ($existing->schedule_date ?? ''),
            'due_date' => $this->parseDateTimeStartOfDay($validated['due_date']),
            'completion_date' => $compDate,
            'prepared_by' => $validated['prepared_by'],
            'authorized_by' => $validated['authorized_by'],
            'banner_img' => $bannerName,
            'cover_img' => $coverName,
            'modifieddate' => $now,
            'modifiedby' => $userId,
            'final_releasestatus' => $status1 === 'Released' ? '1' : '0',
        ];

        DB::table('contenttrans')->where('id', $id)->update($payload);

        return response()->json([
            'message' => 'News content updated successfully.',
            'data' => ['id' => $id],
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newslisting', 'allow_delete')) {
            return $deny;
        }

        $row = DB::table('contenttrans')->where('id', $id)->first();
        if (! $row) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        DB::transaction(function () use ($row, $id): void {
            $this->deleteNewsImageIfExists((string) ($row->banner_img ?? ''), 'banner');
            $this->deleteNewsImageIfExists((string) ($row->cover_img ?? ''), 'cover');
            $video = (string) ($row->youtube_video ?? '');
            if ($video !== '') {
                $path = public_path('videos/'.$video);
                if (is_file($path)) {
                    @unlink($path);
                }
            }

            DB::table('memberstrans')->where('contenttrans_id', $id)->delete();
            DB::table('textarticle')->where('edited_id', $id)->delete();
            DB::table('contentcharttrans')->where('contentedit_id', $id)->delete();
            DB::table('reviewerfeedback')->where('contentedit_id', $id)->delete();
            DB::table('contenttrans')->where('id', $id)->delete();
        });

        return response()->json(['message' => 'News content deleted successfully.']);
    }

    public function updateTextArticle(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newslisting', 'allow_edit')) {
            return $deny;
        }

        if (! DB::table('contenttrans')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'article_content' => ['nullable', 'string'],
        ]);

        $html = (string) ($validated['article_content'] ?? '');
        $now = now();
        $userId = $this->resolveRealUserId($request);

        $exists = DB::table('textarticle')->where('edited_id', $id)->exists();
        if ($exists) {
            DB::table('textarticle')->where('edited_id', $id)->update([
                'article_content' => $html,
                'modifieddate' => $now,
                'modifiedby' => (string) $userId,
            ]);
        } else {
            DB::table('textarticle')->insert([
                'edited_id' => $id,
                'article_content' => $html,
                'modifieddate' => $now,
                'modifiedby' => (string) $userId,
            ]);
        }

        return response()->json(['message' => 'Text article saved.', 'success' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateContent(Request $request, ?int $ignoreId): array
    {
        $subRule = Rule::exists('subcategorymst', 'id')->where(
            fn ($q) => $q->where('category_id', (int) $request->input('category_id'))
        );

        return $request->validate([
            'category_id' => ['required', 'integer', 'exists:categorymst,id'],
            'subcategory_id' => ['required', 'integer', $subRule],
            'title' => ['required', 'string', 'max:500'],
            'seo_keyword' => ['required', 'string', 'max:255'],
            'news_source' => ['required', 'integer', 'exists:newsource,id'],
            'prepared_by' => ['required', 'string', 'max:50'],
            'authorized_by' => ['required', 'string', 'max:100'],
            'permalink' => ['required', 'string', 'max:500'],
            'status1' => ['required', 'string', Rule::in(self::STATUS_DRAFT)],
            'due_date' => ['required', 'date'],
            'p2d_date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
            'shared_folder' => ['nullable', 'string', 'max:255'],
            'last_serialno' => ['required', 'integer', 'min:1'],
            'p2d_caseno' => ['required', 'string', 'max:50'],
            'featured_content' => ['nullable'],
            'completion_date' => ['nullable', 'date'],
            'schedule_date' => ['nullable', 'date'],
            'schedule_time' => ['nullable', 'string', 'max:10'],
            'banner_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif', 'max:8192'],
            'cover_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif', 'max:8192'],
        ]);
    }

    private function assertUniqueTitleAndPermalink(string $title, string $permalink, ?int $ignoreId): void
    {
        $titleQuery = DB::table('contenttrans')->where('title', $title)->where('final_releasestatus', '1');
        if ($ignoreId !== null) {
            $titleQuery->where('id', '!=', $ignoreId);
        }
        if ($titleQuery->exists()) {
            abort(response()->json(['message' => 'Same news title already exists for another released content.'], 422));
        }

        $permalinkQuery = DB::table('contenttrans')->where('permalink', ucwords($permalink));
        if ($ignoreId !== null) {
            $permalinkQuery->where('id', '!=', $ignoreId);
        }
        if ($permalinkQuery->exists()) {
            abort(response()->json(['message' => 'Same permalink already exists for another content.'], 422));
        }
    }

    /**
     * @return array{0: string, 1: ?string}
     */
    private function resolveStatusAndSchedule(Request $request): array
    {
        $now = Carbon::now();
        $scheduleDateInput = trim((string) $request->input('schedule_date', ''));
        $scheduleTime = trim((string) $request->input('schedule_time', '00:00'));
        if ($scheduleTime === '') {
            $scheduleTime = '00:00';
        }

        $statusFromForm = (string) $request->input('status1', 'Pending');
        $statusval = $statusFromForm;
        $scheduleStr = null;

        if ($scheduleDateInput !== '') {
            try {
                $sch = Carbon::parse($scheduleDateInput.' '.$scheduleTime);
            } catch (\Throwable) {
                abort(response()->json(['message' => 'Invalid schedule date or time.'], 422));
            }
            if ($sch->lt($now)) {
                abort(response()->json(['message' => 'Schedule date cannot be earlier than the current time.'], 422));
            }
            $scheduleStr = $sch->format('Y-m-d H:i:s');
            $statusval = $sch->lte($now) ? 'Released' : 'Booked';
        }

        return [$statusval, $scheduleStr];
    }

    private function parseDateTimeStartOfDay(string $date): string
    {
        return Carbon::parse($date)->startOfDay()->format('Y-m-d H:i:s');
    }

    private function parseDateOrEmpty(?string $date): string
    {
        if ($date === null || $date === '') {
            return '';
        }
        try {
            $c = Carbon::parse($date);

            return $c->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return '';
        }
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function transformListItem(array $item): array
    {
        $cover = $item['cover_img'] ?? '';
        $banner = $item['banner_img'] ?? '';

        return [
            'id' => (int) $item['id'],
            'p2d_caseno' => (string) ($item['p2d_caseno'] ?? ''),
            'category_name' => (string) ($item['category_name'] ?? ''),
            'subcategory_name' => (string) ($item['subcategory_name'] ?? ''),
            'title' => (string) ($item['title'] ?? ''),
            'permalink' => (string) ($item['permalink'] ?? ''),
            'news_source_name' => (string) ($item['news_source_name'] ?? ''),
            'schedule_date' => $item['schedule_date'] ?? null,
            'status1' => (string) ($item['status1'] ?? ''),
            'final_releasestatus' => (string) ($item['final_releasestatus'] ?? ''),
            'featured_content' => (string) ($item['featured_content'] ?? '0'),
            'cover_img' => (string) $cover,
            'cover_img_url' => $cover !== '' ? url('images/NewsContents/coverImages/'.$cover) : null,
            'banner_img_url' => $banner !== '' ? url('images/NewsContents/bannerImages/'.$banner) : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function transformRecord(array $row): array
    {
        $cover = (string) ($row['cover_img'] ?? '');
        $banner = (string) ($row['banner_img'] ?? '');
        $sched = $row['schedule_date'] ?? null;
        $schedDate = '';
        $schedTime = '';
        if ($sched !== null && $sched !== '') {
            try {
                $c = Carbon::parse((string) $sched);
                $schedDate = $c->format('Y-m-d');
                $schedTime = $c->format('H:i');
            } catch (\Throwable) {
                $schedDate = '';
                $schedTime = '';
            }
        }

        $status1 = (string) ($row['status1'] ?? 'Pending');
        if ($status1 === 'Released' || $status1 === 'Booked') {
            $statusForForm = 'Pending';
        } else {
            $statusForForm = $status1;
        }

        return [
            'id' => (int) $row['id'],
            'category_id' => (int) ($row['category_id'] ?? 0),
            'subcategory_id' => (int) ($row['subcategory_id'] ?? 0),
            'category_name' => $row['category_name'] ?? null,
            'subcategory_name' => $row['subcategory_name'] ?? null,
            'p2d_caseno' => (string) ($row['p2d_caseno'] ?? ''),
            'last_serialno' => (int) ($row['last_serialno'] ?? 0),
            'title' => (string) ($row['title'] ?? ''),
            'permalink' => (string) ($row['permalink'] ?? ''),
            'seo_keyword' => (string) ($row['seo_keyword'] ?? ''),
            'description' => (string) ($row['description'] ?? ''),
            'news_source' => (int) ($row['news_source'] ?? 0),
            'news_source_name' => $row['news_source_name'] ?? null,
            'shared_folder' => (string) ($row['shared_folder'] ?? ''),
            'featured_content' => (string) ($row['featured_content'] ?? '0'),
            'p2d_date' => $this->formatDateInput($row['p2d_date'] ?? null),
            'due_date' => $this->formatDateInput($row['due_date'] ?? null),
            'completion_date' => $this->formatDateInput($row['completion_date'] ?? null),
            'schedule_date' => $schedDate,
            'schedule_time' => $schedTime,
            'status1' => $statusForForm,
            'status1_display' => (string) ($row['status1'] ?? ''),
            'prepared_by' => (string) ($row['prepared_by'] ?? ''),
            'authorized_by' => (string) ($row['authorized_by'] ?? ''),
            'banner_img' => $banner,
            'cover_img' => $cover,
            'banner_img_url' => $banner !== '' ? url('images/NewsContents/bannerImages/'.$banner) : null,
            'cover_img_url' => $cover !== '' ? url('images/NewsContents/coverImages/'.$cover) : null,
            'final_releasestatus' => (string) ($row['final_releasestatus'] ?? '0'),
            'article_content' => (string) ($row['article_content'] ?? ''),
        ];
    }

    private function formatDateInput(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        try {
            return Carbon::parse((string) $value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function storeNewsImage(\Illuminate\Http\UploadedFile $file, string $kind): string
    {
        $basePath = $kind === 'banner' ? 'images/NewsContents/bannerImages' : 'images/NewsContents/coverImages';
        $directory = public_path($basePath);
        File::ensureDirectoryExists($directory);
        $filename = date('YmdHis').'_'.bin2hex(random_bytes(4)).'.'.$file->getClientOriginalExtension();
        $file->move($directory, $filename);

        return $filename;
    }

    private function deleteNewsImageIfExists(string $filename, string $kind): void
    {
        if ($filename === '') {
            return;
        }
        $basePath = $kind === 'banner' ? 'images/NewsContents/bannerImages' : 'images/NewsContents/coverImages';
        $fullPath = public_path($basePath.'/'.$filename);
        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }
}
