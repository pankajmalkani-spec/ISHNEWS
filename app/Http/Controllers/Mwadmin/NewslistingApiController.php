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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class NewslistingApiController extends Controller
{
    use AuthorizesMwadminPermissions;
    use ResolvesMwadminUser;

    /** @var list<string> */
    private const STATUS_DRAFT = ['Pending', 'WIP', 'Ready', 'Issue', 'Dropped', 'Hold'];

    /**
     * Legacy DB: `contenttrans.schedule_date` is NOT NULL; CodeIgniter stored '' or 1970-01-01 for “no schedule”.
     * Strict MySQL rejects '' and NULL — use this sentinel (matches mwadmin/newslisting/edit.php checks).
     */
    private const LEGACY_EMPTY_SCHEDULE_DATETIME = '1970-01-01 00:00:00';

    /** DATE columns (`completion_date` etc.) are NOT NULL with no default — legacy used empty / 1970-01-01. */
    private const LEGACY_EMPTY_DATE = '1970-01-01';

    public function options(Request $request): JsonResponse
    {
        // Legacy create/edit screens need these options even for add-only users.
        if ($deny = $this->mwadminDenyUnlessAny($request, 'newslisting', ['allow_add', 'allow_edit', 'allow_view'])) {
            return $deny;
        }

        $categoryId = (int) $request->query('category_id', 0);
        $categories = DB::table('categorymst')->select('id', 'title')->where('status', 1)->orderBy('title')->get();
        $newsSources = DB::table('newsource')->select('id', 'name')->where('status', 1)->orderBy('name')->get();
        $designations = DB::table('designation')->select('id', 'designation')->where('status', 1)->orderBy('designation')->get();
        $users = DB::table('users')
            ->select('userid', 'first_name', 'last_name', 'designation')
            ->where('status', 1)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();
        $subcategories = $categoryId > 0
            ? DB::table('subcategorymst')->select('id', 'name', 'category_id')->where('category_id', $categoryId)->where('status', 1)->orderBy('name')->get()
            : [];

        $nextId = (int) (DB::table('contenttrans')->max('id') ?? 0) + 1;

        return response()->json([
            'categories' => $categories,
            'news_sources' => $newsSources,
            'designations' => $designations,
            'users' => $users,
            'subcategories' => $subcategories,
            'suggested_next_id' => $nextId,
        ]);
    }

    public function nextMeta(Request $request): JsonResponse
    {
        // Next IDs/serials are used by create flow; allow add/edit/view roles.
        if ($deny = $this->mwadminDenyUnlessAny($request, 'newslisting', ['allow_add', 'allow_edit', 'allow_view'])) {
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
        $filterDateFrom = trim((string) $request->query('filter_date_from', ''));
        $filterDateTo = trim((string) $request->query('filter_date_to', ''));

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
        if ($filterDateFrom !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $filterDateFrom)) {
            $query->whereDate('ct.schedule_date', '>=', $filterDateFrom);
        }
        if ($filterDateTo !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $filterDateTo)) {
            $query->whereDate('ct.schedule_date', '<=', $filterDateTo);
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

        $featured = ! empty($validated['featured_content']) ? 1 : 0;
        $compYmd = $this->parseOptionalDateColumnYmd($validated['completion_date'] ?? null);

        $bannerName = $request->hasFile('banner_img') ? $this->storeNewsImage($request->file('banner_img'), 'banner') : '';
        $coverName = $request->hasFile('cover_img') ? $this->storeNewsImage($request->file('cover_img'), 'cover') : '';

        $descRaw = (string) ($validated['description'] ?? '');
        $description = $descRaw !== '' ? ucfirst($descRaw) : '';
        $description = Str::limit($description, 200, '');

        $payload = $this->contenttransLegacyInsertPayload(
            $validated,
            $status1,
            $scheduleDate,
            $description,
            $featured,
            $bannerName,
            $coverName,
            $compYmd,
            $now,
            $userId,
        );

        $id = DB::table('contenttrans')->insertGetId($payload);
        $members = $validated['members'] ?? [];
        if (is_array($members) && count($members) > 0) {
            foreach ($members as $m) {
                DB::table('memberstrans')->insert([
                    'contenttrans_id' => $id,
                    'designation_id' => (int) $m['designation_id'],
                    'user_id' => (int) $m['user_id'],
                    'instructions' => (string) ($m['instructions'] ?? ''),
                ]);
            }
        }

        return response()->json([
            'message' => 'News content created successfully.',
            /** Legacy `Newslisting` create JSON: `step` => 2 (P2D CheckList tab). */
            'data' => ['id' => $id, 'next_step' => 2],
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

        $featured = ! empty($validated['featured_content']) ? 1 : 0;
        $compYmd = $this->parseOptionalDateColumnYmd($validated['completion_date'] ?? null);

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

        $descRaw = (string) ($validated['description'] ?? '');
        $description = $descRaw !== '' ? ucfirst($descRaw) : '';
        $description = Str::limit($description, 200, '');

        $payload = [
            'category_id' => (int) $validated['category_id'],
            'subcategory_id' => (int) $validated['subcategory_id'],
            'last_serialno' => (int) $validated['last_serialno'],
            'p2d_caseno' => Str::limit(strtoupper((string) $validated['p2d_caseno']), 80, ''),
            'permalink' => ucwords(Str::limit($validated['permalink'], 150, '')),
            'status1' => $status1,
            'title' => Str::limit($validated['title'], 200, ''),
            'seo_keyword' => Str::limit($validated['seo_keyword'], 100, ''),
            'featured_content' => $featured,
            'news_source' => (string) (int) $validated['news_source'],
            'shared_folder' => Str::limit((string) ($validated['shared_folder'] ?? ''), 255, ''),
            'description' => $description,
            'schedule_date' => $this->persistScheduleDate($scheduleDate, $existing->schedule_date ?? null),
            'due_date' => $this->parseSqlDateColumn($validated['due_date']),
            'p2d_date' => $this->parseSqlDateColumn($validated['p2d_date']),
            'completion_date' => $this->persistCompletionDate($compYmd, $existing->completion_date ?? null),
            'prepared_by' => Str::limit($validated['prepared_by'], 100, ''),
            'authorized_by' => Str::limit($validated['authorized_by'], 100, ''),
            'banner_img' => Str::limit($bannerName, 80, ''),
            'cover_img' => Str::limit($coverName, 80, ''),
            'youtube_url_check' => $this->legacyTinyint($validated['youtube_url_check'] ?? null),
            'youtube_url' => Str::limit((string) ($validated['youtube_url'] ?? ''), 100, ''),
            'youtube_video_check' => $this->legacyTinyint($validated['youtube_video_check'] ?? null),
            'youtube_video' => Str::limit((string) ($validated['youtube_video'] ?? ''), 100, ''),
            'youtube_subtitles' => Str::limit((string) ($validated['youtube_subtitles'] ?? ''), 100, ''),
            'modifieddate' => $now,
            'modifiedby' => $userId,
            'final_releasestatus' => $status1 === 'Released' ? 1 : 0,
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
            /** `contenttrans` column sizes (legacy ishnewsdb). */
            'title' => ['required', 'string', 'max:200'],
            'seo_keyword' => ['required', 'string', 'max:100'],
            'news_source' => ['required', 'integer', 'exists:newsource,id'],
            'prepared_by' => ['required', 'string', 'max:100'],
            'authorized_by' => ['required', 'string', 'max:100'],
            'permalink' => ['required', 'string', 'max:150'],
            'status1' => ['required', 'string', Rule::in(self::STATUS_DRAFT)],
            'due_date' => ['required', 'date'],
            'p2d_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:200'],
            'shared_folder' => ['nullable', 'string', 'max:255'],
            'last_serialno' => ['required', 'integer', 'min:1'],
            'p2d_caseno' => ['required', 'string', 'max:80'],
            'featured_content' => ['nullable'],
            'completion_date' => ['nullable', 'date'],
            'schedule_date' => ['nullable', 'date'],
            'schedule_time' => ['nullable', 'string', 'max:10'],
            'banner_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif', 'max:8192'],
            'cover_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif', 'max:8192'],
            'youtube_url_check' => ['nullable'],
            'youtube_url' => ['nullable', 'string', 'max:100'],
            'youtube_video_check' => ['nullable'],
            'youtube_video' => ['nullable', 'string', 'max:100'],
            'youtube_subtitles' => ['nullable', 'string', 'max:100'],
            'members' => ['nullable', 'array'],
            'members.*.designation_id' => ['required_with:members', 'integer', 'exists:designation,id'],
            'members.*.user_id' => ['required_with:members', 'integer', 'exists:users,userid'],
            'members.*.instructions' => ['nullable', 'string', 'max:255'],
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
     * Full `contenttrans` row for INSERT — legacy table has NOT NULL on every column without server defaults.
     *
     * @param  array<string, mixed>  $validated
     */
    private function contenttransLegacyInsertPayload(
        array $validated,
        string $status1,
        ?string $scheduleResolved,
        string $description,
        int $featured,
        string $bannerName,
        string $coverName,
        ?string $completionYmd,
        \DateTimeInterface $now,
        int $userId,
    ): array {
        return [
            'flowchart_templateid' => 0,
            'category_id' => (int) $validated['category_id'],
            'subcategory_id' => (int) $validated['subcategory_id'],
            'last_serialno' => (int) $validated['last_serialno'],
            'p2d_caseno' => Str::limit(strtoupper((string) $validated['p2d_caseno']), 80, ''),
            'p2d_date' => $this->parseSqlDateColumn((string) $validated['p2d_date']),
            'status1' => $status1,
            'banner_img' => Str::limit($bannerName, 80, ''),
            'cover_img' => Str::limit($coverName, 80, ''),
            'slider_img' => '',
            'title' => Str::limit((string) $validated['title'], 200, ''),
            'seo_keyword' => Str::limit((string) $validated['seo_keyword'], 100, ''),
            'featured_content' => $featured,
            'description' => $description,
            'news_source' => (string) (int) $validated['news_source'],
            'permalink' => Str::limit(ucwords((string) $validated['permalink']), 150, ''),
            'due_date' => $this->parseSqlDateColumn((string) $validated['due_date']),
            'completion_date' => $this->persistCompletionDate($completionYmd, null),
            'schedule_date' => $this->persistScheduleDate($scheduleResolved, null),
            'prepared_by' => Str::limit((string) $validated['prepared_by'], 100, ''),
            'authorized_by' => Str::limit((string) $validated['authorized_by'], 100, ''),
            'youtube_url_check' => 0,
            'youtube_url' => '',
            'youtube_video_check' => 0,
            'youtube_video' => '',
            'youtube_subtitles' => '',
            'addeddate' => $now,
            'addedby' => $userId,
            'modifieddate' => $now,
            'modifiedby' => $userId,
            'final_releasestatus' => $status1 === 'Released' ? 1 : 0,
            'shared_folder' => Str::limit((string) ($validated['shared_folder'] ?? ''), 255, ''),
        ];
    }

    private function parseSqlDateColumn(string $dateInput): string
    {
        return Carbon::parse($dateInput)->format('Y-m-d');
    }

    private function parseOptionalDateColumnYmd(?string $date): ?string
    {
        if ($date === null || $date === '') {
            return null;
        }
        try {
            return Carbon::parse($date)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * `completion_date` is NOT NULL DATE — use {@see self::LEGACY_EMPTY_DATE} when unset (legacy empty / 1970).
     */
    private function persistCompletionDate(?string $parsedYmd, mixed $existingRaw): string
    {
        if ($parsedYmd !== null && $parsedYmd !== '') {
            return $parsedYmd;
        }
        if ($existingRaw !== null && $existingRaw !== '') {
            try {
                $ymd = Carbon::parse((string) $existingRaw)->format('Y-m-d');
                if (! str_starts_with($ymd, '1970-01-01') && ! str_starts_with($ymd, '0000-00-00')) {
                    return $ymd;
                }
            } catch (\Throwable) {
                // fall through
            }
        }

        return self::LEGACY_EMPTY_DATE;
    }

    private function legacyTinyint(mixed $value): int
    {
        return $value === true || $value === 1 || $value === '1' ? 1 : 0;
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

    /**
     * Normalize legacy/empty DB values so we never write '' into DATETIME columns on update.
     */
    private function datetimeOrNullFromDb(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $s = trim((string) $raw);
        if ($s === '' || str_starts_with($s, '0000-00-00')) {
            return null;
        }

        return $s;
    }

    private function isLegacyEmptyScheduleDatetime(?string $datetime): bool
    {
        if ($datetime === null || $datetime === '') {
            return true;
        }
        $t = trim($datetime);

        return str_starts_with($t, '0000-00-00')
            || str_starts_with($t, '1970-01-01');
    }

    /**
     * Persist schedule: NOT NULL column + strict mode — never '', never NULL; use {@see self::LEGACY_EMPTY_SCHEDULE_DATETIME} when unset.
     *
     * @param  string|null  $resolvedFromForm  Y-m-d H:i:s from resolveStatusAndSchedule, or null if form left schedule blank.
     */
    private function persistScheduleDate(?string $resolvedFromForm, mixed $existingFromDb): string
    {
        if ($resolvedFromForm !== null && $resolvedFromForm !== '') {
            return $resolvedFromForm;
        }

        $existing = $this->datetimeOrNullFromDb($existingFromDb);
        if ($existing !== null && ! $this->isLegacyEmptyScheduleDatetime($existing)) {
            return $existing;
        }

        return self::LEGACY_EMPTY_SCHEDULE_DATETIME;
    }

    /**
     * MySQL zero-date / empty schedule → null for JSON (listing shows “Unscheduled”).
     */
    private function normalizeListScheduleDate(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $s = trim((string) $raw);
        if ($s === '') {
            return null;
        }
        if (str_starts_with($s, '0000-00-00')) {
            return null;
        }
        if (str_starts_with($s, '1970-01-01')) {
            return null;
        }

        return $s;
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
            'schedule_date' => $this->normalizeListScheduleDate($item['schedule_date'] ?? null),
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
        $schedRaw = $sched !== null ? trim((string) $sched) : '';
        if ($schedRaw !== '' && ! $this->isLegacyEmptyScheduleDatetime($schedRaw)) {
            try {
                $c = Carbon::parse($schedRaw);
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
            'completion_date' => $this->formatDateInputForDisplay($row['completion_date'] ?? null),
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
            'youtube_url_check' => (string) ((int) ($row['youtube_url_check'] ?? 0)),
            'youtube_url' => (string) ($row['youtube_url'] ?? ''),
            'youtube_video_check' => (string) ((int) ($row['youtube_video_check'] ?? 0)),
            'youtube_video' => (string) ($row['youtube_video'] ?? ''),
            'youtube_subtitles' => (string) ($row['youtube_subtitles'] ?? ''),
            'flowchart_templateid' => (int) ($row['flowchart_templateid'] ?? 0),
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

    /** Hide legacy DATE sentinels from API consumers (forms). */
    private function formatDateInputForDisplay(mixed $value): ?string
    {
        $f = $this->formatDateInput($value);
        if ($f === null) {
            return null;
        }
        if (str_starts_with($f, '1970-01-01') || str_starts_with($f, '0000-00-00')) {
            return null;
        }

        return $f;
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
