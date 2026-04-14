<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Mwadmin\Concerns\AuthorizesMwadminPermissions;
use App\Models\Subcategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;

class SubcategoryApiController extends Controller
{
    use AuthorizesMwadminPermissions;

    public function options(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'subcategory', 'allow_view')) {
            return $deny;
        }

        $categories = DB::table('categorymst')
            ->select('id', 'title')
            ->where('status', 1)
            ->orderBy('title')
            ->get();

        return response()->json(['categories' => $categories]);
    }

    public function verifySort(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnlessAny($request, 'subcategory', ['allow_add', 'allow_edit'])) {
            return $deny;
        }

        $validated = $request->validate([
            'sort' => ['required', 'integer'],
            'ignore_id' => ['nullable', 'integer'],
        ]);

        $query = Subcategory::query()->where('sort', $validated['sort']);
        if (!empty($validated['ignore_id'])) {
            $query->where('id', '!=', (int) $validated['ignore_id']);
        }

        $exists = $query->exists();
        return response()->json([
            'exists' => $exists,
            'message' => $exists ? 'Same Sort No. already exists, for already created Sub-Category !!' : '',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'subcategory', 'allow_view')) {
            return $deny;
        }

        $perPageRaw = $request->query('per_page', '10');
        $showAll = is_string($perPageRaw) && strtolower(trim((string) $perPageRaw)) === 'all';
        $perPage = $showAll ? null : max(1, min((int) $perPageRaw, 100));
        $search = trim((string) $request->query('search', ''));
        $sortBy = (string) $request->query('sort_by', 'id');
        $sortDir = strtolower((string) $request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSort = ['id', 'subcat_code', 'name', 'category_title', 'sort', 'status'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'id';
        }

        $query = DB::table('subcategorymst as s')
            ->leftJoin('categorymst as c', 'c.id', '=', 's.category_id')
            ->selectRaw('s.id, s.name, s.subcat_code, s.category_id, c.title as category_title, s.color, s.banner_img, s.box_img, s.sort, s.status');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('s.subcat_code', 'like', "%{$search}%")
                    ->orWhere('s.name', 'like', "%{$search}%")
                    ->orWhere('c.title', 'like', "%{$search}%");
            });
        }

        $query->orderBy($sortBy === 'category_title' ? 'c.title' : "s.{$sortBy}", $sortDir);

        if ($showAll) {
            $items = $query->get();
            $total = $items->count();
            $collection = $items->map(fn ($item) => $this->transformListItem((array) $item))->values();

            return response()->json([
                'data' => $collection,
                'meta' => [
                    'current_page' => 1,
                    'per_page' => $total,
                    'total' => $total,
                    'last_page' => 1,
                ],
            ]);
        }

        $paginator = $query->paginate((int) $perPage)->withQueryString();
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

    public function store(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'subcategory', 'allow_add')) {
            return $deny;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:250', 'regex:/^[a-zA-Z_.\s-]+$/'],
            'category_id' => ['required', 'integer', Rule::exists('categorymst', 'id')->where('status', 1)],
            'subcat_code' => ['required', 'string', 'max:25', 'unique:subcategorymst,subcat_code'],
            'color' => ['required', 'string', 'max:20'],
            'sort' => ['required', 'integer', 'unique:subcategorymst,sort'],
            'status' => ['required', 'in:0,1'],
            'banner_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
            'box_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
        ]);

        $userId = (int) data_get($request->session()->get('ishnews_session', []), 'user_id', 0);

        $subcategory = new Subcategory();
        $subcategory->name = ucwords($validated['name']);
        $subcategory->category_id = (int) $validated['category_id'];
        $subcategory->subcat_code = strtoupper($validated['subcat_code']);
        $subcategory->color = $validated['color'];
        $subcategory->sort = (int) $validated['sort'];
        $subcategory->status = (int) $validated['status'];
        $subcategory->addeddate = now();
        $subcategory->addedby = $userId;
        $subcategory->modifieddate = now();
        $subcategory->modifiedby = $userId;
        $subcategory->banner_img = $request->hasFile('banner_img') ? $this->storeImage($request->file('banner_img'), 'banner') : '';
        $subcategory->box_img = $request->hasFile('box_img') ? $this->storeImage($request->file('box_img'), 'box') : '';
        $subcategory->save();

        return response()->json([
            'message' => 'Sub-Category created successfully.',
            'data' => $this->transformRecord($subcategory),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'subcategory', 'allow_view')) {
            return $deny;
        }

        $subcategory = Subcategory::query()->findOrFail($id);
        return response()->json(['data' => $this->transformRecord($subcategory)]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'subcategory', 'allow_edit')) {
            return $deny;
        }

        $subcategory = Subcategory::query()->findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:250', 'regex:/^[a-zA-Z_.\s-]+$/'],
            'category_id' => ['required', 'integer', 'exists:categorymst,id'],
            'subcat_code' => ['required', 'string', 'max:25', Rule::unique('subcategorymst', 'subcat_code')->ignore($id)],
            'color' => ['required', 'string', 'max:20'],
            'sort' => ['required', 'integer', Rule::unique('subcategorymst', 'sort')->ignore($id)],
            'status' => ['required', 'in:0,1'],
            'banner_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
            'box_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
        ]);

        $userId = (int) data_get($request->session()->get('ishnews_session', []), 'user_id', 0);
        if ($request->hasFile('banner_img')) {
            $this->deleteImageIfExists($subcategory->banner_img, 'banner');
            $subcategory->banner_img = $this->storeImage($request->file('banner_img'), 'banner');
        }
        if ($request->hasFile('box_img')) {
            $this->deleteImageIfExists($subcategory->box_img, 'box');
            $subcategory->box_img = $this->storeImage($request->file('box_img'), 'box');
        }

        $subcategory->name = ucwords($validated['name']);
        $subcategory->category_id = (int) $validated['category_id'];
        $subcategory->subcat_code = strtoupper($validated['subcat_code']);
        $subcategory->color = $validated['color'];
        $subcategory->sort = (int) $validated['sort'];
        $subcategory->status = (int) $validated['status'];
        if (!$subcategory->addeddate) {
            $subcategory->addeddate = now();
        }
        if (!$subcategory->addedby) {
            $subcategory->addedby = $userId;
        }
        $subcategory->modifieddate = now();
        $subcategory->modifiedby = $userId;
        $subcategory->save();

        return response()->json([
            'message' => 'Sub-Category updated successfully.',
            'data' => $this->transformRecord($subcategory),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'subcategory', 'allow_delete')) {
            return $deny;
        }

        $subcategory = Subcategory::query()->findOrFail($id);
        $userId = (int) data_get($request->session()->get('ishnews_session', []), 'user_id', 0);

        if ((int) $subcategory->status === 0) {
            return response()->json([
                'message' => 'Sub-Category is already inactive.',
            ]);
        }

        $subcategory->status = 0;
        if (!$subcategory->addeddate) {
            $subcategory->addeddate = now();
        }
        if (!$subcategory->addedby) {
            $subcategory->addedby = $userId;
        }
        $subcategory->modifieddate = now();
        $subcategory->modifiedby = $userId;
        $subcategory->save();

        return response()->json([
            'message' => 'Sub-Category has been marked as inactive.',
        ]);
    }

    private function storeImage($file, string $type): string
    {
        $basePath = $type === 'banner' ? 'images/subcategoryImages/bannerImages' : 'images/subcategoryImages/boxImages';
        $directory = public_path($basePath);
        File::ensureDirectoryExists($directory);
        $filename = date('YmdHis').'_'.bin2hex(random_bytes(4)).'.'.$file->getClientOriginalExtension();
        $file->move($directory, $filename);
        return $filename;
    }

    private function deleteImageIfExists(?string $filename, string $type): void
    {
        if (!$filename) {
            return;
        }
        $basePath = $type === 'banner' ? 'images/subcategoryImages/bannerImages' : 'images/subcategoryImages/boxImages';
        $fullPath = public_path($basePath.'/'.$filename);
        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }

    /** Root-relative URL so thumbnails work when APP_URL does not match the browser host/port. */
    private function subcategoryImagePublicUrl(?string $filename, string $type): ?string
    {
        $filename = $filename !== null ? trim((string) $filename) : '';
        if ($filename === '') {
            return null;
        }
        $folder = $type === 'banner' ? 'bannerImages' : 'boxImages';

        return '/images/subcategoryImages/'.$folder.'/'.$filename;
    }

    private function transformRecord(Subcategory $subcategory): array
    {
        $categoryTitle = DB::table('categorymst')->where('id', $subcategory->category_id)->value('title');
        return [
            'id' => $subcategory->id,
            'name' => $subcategory->name,
            'category_id' => (int) $subcategory->category_id,
            'category_title' => $categoryTitle ?: '',
            'subcat_code' => $subcategory->subcat_code,
            'color' => $subcategory->color,
            'sort' => (int) $subcategory->sort,
            'status' => (int) $subcategory->status,
            'banner_img' => $subcategory->banner_img,
            'box_img' => $subcategory->box_img,
            'banner_img_url' => $this->subcategoryImagePublicUrl($subcategory->banner_img, 'banner'),
            'box_img_url' => $this->subcategoryImagePublicUrl($subcategory->box_img, 'box'),
        ];
    }

    private function transformListItem(array $item): array
    {
        return [
            'id' => (int) $item['id'],
            'name' => $item['name'],
            'category_id' => (int) $item['category_id'],
            'category_title' => $item['category_title'] ?? '',
            'subcat_code' => $item['subcat_code'],
            'color' => $item['color'],
            'sort' => (int) $item['sort'],
            'status' => (int) $item['status'],
            'banner_img' => $item['banner_img'],
            'box_img' => $item['box_img'],
            'banner_img_url' => $this->subcategoryImagePublicUrl($item['banner_img'] ?? null, 'banner'),
            'box_img_url' => $this->subcategoryImagePublicUrl($item['box_img'] ?? null, 'box'),
        ];
    }
}