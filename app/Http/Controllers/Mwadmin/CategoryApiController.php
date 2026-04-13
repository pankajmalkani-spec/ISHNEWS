<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;

class CategoryApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPageRaw = $request->query('per_page', '10');
        $showAll = is_string($perPageRaw) && strtolower(trim((string) $perPageRaw)) === 'all';
        $perPage = $showAll ? null : max(1, min((int) $perPageRaw, 100));
        $search = trim((string) $request->query('search', ''));
        $filterCode = trim((string) $request->query('filter_code', ''));
        $filterTitle = trim((string) $request->query('filter_title', ''));
        $filterStatus = (string) $request->query('filter_status', '');
        $sortBy = (string) $request->query('sort_by', 'id');
        $sortDir = strtolower((string) $request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSort = ['id', 'code', 'title', 'sort', 'status', 'total_records'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'id';
        }

        $query = DB::table('categorymst as c')
            ->leftJoin('contenttrans as ct', 'ct.category_id', '=', 'c.id')
            ->selectRaw('c.id, c.code, c.title, c.color, c.banner_img, c.box_img, c.sort, c.status, COUNT(ct.id) as total_records')
            ->groupBy('c.id', 'c.code', 'c.title', 'c.color', 'c.banner_img', 'c.box_img', 'c.sort', 'c.status');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('c.code', 'like', "%{$search}%")
                    ->orWhere('c.title', 'like', "%{$search}%");
            });
        }

        if ($filterCode !== '') {
            $query->where('c.code', 'like', "%{$filterCode}%");
        }

        if ($filterTitle !== '') {
            $query->where('c.title', 'like', "%{$filterTitle}%");
        }

        if ($filterStatus === '1' || $filterStatus === '0') {
            $query->where('c.status', '=', (int) $filterStatus);
        }

        $query->orderBy($sortBy === 'total_records' ? DB::raw('COUNT(ct.id)') : "c.{$sortBy}", $sortDir);

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
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:25', 'unique:categorymst,code'],
            'title' => ['required', 'string', 'max:250', 'regex:/^[a-zA-Z\s]+$/', 'unique:categorymst,title'],
            'color' => ['required', 'string', 'max:20'],
            'sort' => ['required', 'integer', 'unique:categorymst,sort'],
            'status' => ['required', 'in:0,1'],
            'banner_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif', 'max:5120'],
            'box_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif', 'max:5120'],
        ]);

        $userId = (int) data_get($request->session()->get('ishnews_session', []), 'user_id', 0);

        $bannerFile = $request->file('banner_img');
        $boxFile = $request->file('box_img');

        $category = new Category();
        $category->code = strtoupper($validated['code']);
        $category->title = ucwords($validated['title']);
        $category->color = $validated['color'];
        $category->sort = $validated['sort'];
        $category->status = (int) $validated['status'];
        $category->addeddate = now();
        $category->addedby = $userId;
        $category->modifieddate = now();
        $category->modifiedby = $userId;
        $category->banner_img = $bannerFile ? $this->storeImage($bannerFile, 'banner') : '';
        $category->box_img = $boxFile ? $this->storeImage($boxFile, 'box') : '';
        $category->save();

        return response()->json([
            'message' => 'Category created successfully.',
            'data' => $this->transformRecord($category),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $category = Category::query()->findOrFail($id);

        return response()->json([
            'data' => $this->transformRecord($category),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::query()->findOrFail($id);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:25', Rule::unique('categorymst', 'code')->ignore($id)],
            'title' => ['required', 'string', 'max:250', 'regex:/^[a-zA-Z\s]+$/', Rule::unique('categorymst', 'title')->ignore($id)],
            'color' => ['required', 'string', 'max:20'],
            'sort' => ['required', 'integer', Rule::unique('categorymst', 'sort')->ignore($id)],
            'status' => ['required', 'in:0,1'],
            'banner_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif', 'max:5120'],
            'box_img' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif', 'max:5120'],
        ]);

        $userId = (int) data_get($request->session()->get('ishnews_session', []), 'user_id', 0);

        if ($request->hasFile('banner_img')) {
            $this->deleteImageIfExists($category->banner_img, 'banner');
            $category->banner_img = $this->storeImage($request->file('banner_img'), 'banner');
        }

        if ($request->hasFile('box_img')) {
            $this->deleteImageIfExists($category->box_img, 'box');
            $category->box_img = $this->storeImage($request->file('box_img'), 'box');
        }

        $category->code = strtoupper($validated['code']);
        $category->title = ucwords($validated['title']);
        $category->color = $validated['color'];
        $category->sort = $validated['sort'];
        $category->status = (int) $validated['status'];
        if (!$category->addeddate) {
            $category->addeddate = now();
        }
        if (!$category->addedby) {
            $category->addedby = $userId;
        }
        $category->modifieddate = now();
        $category->modifiedby = $userId;
        $category->save();

        return response()->json([
            'message' => 'Category updated successfully.',
            'data' => $this->transformRecord($category),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $category = Category::query()->findOrFail($id);
        $userId = (int) data_get($request->session()->get('ishnews_session', []), 'user_id', 0);

        if ((int) $category->status === 0) {
            return response()->json([
                'message' => 'Category is already inactive.',
            ]);
        }

        $category->status = 0;
        if (!$category->addeddate) {
            $category->addeddate = now();
        }
        if (!$category->addedby) {
            $category->addedby = $userId;
        }
        $category->modifieddate = now();
        $category->modifiedby = $userId;
        $category->save();

        return response()->json([
            'message' => 'Category has been marked as inactive.',
        ]);
    }

    private function storeImage($file, string $type): string
    {
        $basePath = $type === 'banner' ? 'images/categoryImages/bannerImages' : 'images/categoryImages/boxImages';
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

        $basePath = $type === 'banner' ? 'images/categoryImages/bannerImages' : 'images/categoryImages/boxImages';
        $fullPath = public_path($basePath.'/'.$filename);

        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }

    private function transformRecord(Category $category): array
    {
        return [
            'id' => $category->id,
            'code' => $category->code,
            'title' => $category->title,
            'color' => $category->color,
            'sort' => $category->sort,
            'status' => (int) $category->status,
            'banner_img' => $category->banner_img,
            'box_img' => $category->box_img,
            'banner_img_url' => $category->banner_img ? url('images/categoryImages/bannerImages/'.$category->banner_img) : null,
            'box_img_url' => $category->box_img ? url('images/categoryImages/boxImages/'.$category->box_img) : null,
            'addeddate' => $category->addeddate,
            'modifieddate' => $category->modifieddate,
        ];
    }

    private function transformListItem(array $item): array
    {
        return [
            'id' => (int) $item['id'],
            'code' => $item['code'],
            'title' => $item['title'],
            'color' => $item['color'],
            'sort' => (int) $item['sort'],
            'status' => (int) $item['status'],
            'total_records' => (int) $item['total_records'],
            'banner_img' => $item['banner_img'],
            'box_img' => $item['box_img'],
            'banner_img_url' => $item['banner_img'] ? url('images/categoryImages/bannerImages/'.$item['banner_img']) : null,
            'box_img_url' => $item['box_img'] ? url('images/categoryImages/boxImages/'.$item['box_img']) : null,
        ];
    }
}