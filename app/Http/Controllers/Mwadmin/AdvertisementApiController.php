<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Mwadmin\Concerns\AuthorizesMwadminPermissions;
use App\Http\Controllers\Mwadmin\Concerns\ResolvesMwadminUser;
use App\Models\Advertisement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdvertisementApiController extends Controller
{
    use AuthorizesMwadminPermissions;
    use ResolvesMwadminUser;

    private function imgPublicUrl(?string $filename): ?string
    {
        if ($filename === null || $filename === '') {
            return null;
        }

        return '/images/AdvertiseImages/'.ltrim($filename, '/');
    }

    public function options(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'advertisement', 'allow_view')) {
            return $deny;
        }

        $subcats = DB::table('subcategorymst')
            ->where('status', 1)
            ->orderBy('subcat_code')
            ->get(['id', 'subcat_code']);

        return response()->json(['subcategories' => $subcats]);
    }

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'advertisement', 'allow_view')) {
            return $deny;
        }

        $perPageParam = (string) $request->query('per_page', '10');
        $allRows = strtolower($perPageParam) === 'all';
        $perPage = $allRows ? 100000 : max(1, min((int) $perPageParam, 100));
        $search = trim((string) $request->query('search', ''));
        $filterCompany = trim((string) $request->query('filter_company', ''));
        $filterStatus = trim((string) $request->query('filter_status', ''));

        $query = DB::table('advertisement as a')
            ->leftJoin('subcategorymst as s', 's.id', '=', 'a.category_id')
            ->select([
                'a.id',
                'a.title',
                'a.company_name',
                'a.img_url',
                'a.ad_url',
                'a.contactperson_name',
                'a.email',
                'a.mobile',
                'a.start_date',
                'a.end_date',
                'a.status',
                's.subcat_code',
            ]);

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('a.title', 'like', "%{$search}%")
                    ->orWhere('a.company_name', 'like', "%{$search}%")
                    ->orWhere('a.contactperson_name', 'like', "%{$search}%");
            });
        }
        if ($filterCompany !== '') {
            $query->where('a.company_name', 'like', "%{$filterCompany}%");
        }
        if ($filterStatus !== '') {
            $query->where('a.status', $filterStatus === 'Active' ? 1 : 0);
        }

        $paginator = $query->orderByDesc('a.id')->paginate($perPage)->withQueryString();

        $collection = collect($paginator->items())->map(function ($item) {
            $start = $item->start_date;
            $end = $item->end_date;
            if ($start === '1970-01-01' || $start === null) {
                $start = null;
            }
            if ($end === '1970-01-01' || $end === null) {
                $end = null;
            }

            return [
                'id' => $item->id,
                'title' => $item->title,
                'company_name' => $item->company_name,
                'img_url' => $item->img_url,
                'image_url' => $this->imgPublicUrl($item->img_url),
                'ad_url' => $item->ad_url,
                'contactperson_name' => $item->contactperson_name,
                'email' => $item->email,
                'mobile' => $item->mobile,
                'subcat_code' => $item->subcat_code,
                'start_date' => $start,
                'end_date' => $end,
                'status' => (int) $item->status,
            ];
        })->values();

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
        if ($deny = $this->mwadminDenyUnless($request, 'advertisement', 'allow_view')) {
            return $deny;
        }

        $row = Advertisement::query()->findOrFail($id);
        $sub = DB::table('subcategorymst')->where('id', $row->category_id)->value('subcat_code');

        return response()->json([
            'data' => [
                'id' => $row->id,
                'title' => $row->title,
                'company_name' => $row->company_name,
                'brand' => $row->brand,
                'model' => $row->model,
                'ad_type' => (int) $row->ad_type,
                'category_id' => (int) $row->category_id,
                'subcat_code' => $sub,
                'img_url' => $row->img_url,
                'image_url' => $this->imgPublicUrl($row->img_url),
                'ad_url' => $row->ad_url,
                'contactperson_name' => $row->contactperson_name,
                'email' => $row->email,
                'mobile' => $row->mobile,
                'annual_rates' => (string) $row->annual_rates,
                'start_date' => $row->start_date && $row->start_date->format('Y-m-d') !== '1970-01-01' ? $row->start_date->format('Y-m-d') : null,
                'end_date' => $row->end_date && $row->end_date->format('Y-m-d') !== '1970-01-01' ? $row->end_date->format('Y-m-d') : null,
                'status' => (int) $row->status,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'advertisement', 'allow_add')) {
            return $deny;
        }

        $adType = (int) $request->input('ad_type', 0);
        $categoryRules = $adType === 1
            ? ['required', 'integer', Rule::exists('subcategorymst', 'id')->where('status', 1)]
            : ['nullable', 'integer'];

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'company_name' => ['required', 'string', 'max:150'],
            'contactperson_name' => ['required', 'string', 'max:150', 'regex:/^[a-zA-Z.\s]+$/'],
            'ad_url' => ['required', 'url', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'mobile' => ['nullable', 'string', 'max:20'],
            'brand' => ['nullable', 'string', 'max:150'],
            'model' => ['nullable', 'string', 'max:150'],
            'ad_type' => ['required', 'integer', 'in:0,1'],
            'category_id' => $categoryRules,
            'annual_rates' => ['required', 'numeric'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'status' => ['required', 'in:0,1'],
            'img' => ['nullable', 'file', 'image', 'max:5120'],
        ]);

        $categoryId = $adType === 0 ? 0 : (int) $validated['category_id'];

        if (Advertisement::query()->where('contactperson_name', $validated['contactperson_name'])->where('status', 1)->exists()) {
            return response()->json(['message' => 'Same Contact Person Name already exists for another active advertisement.'], 422);
        }
        if (! empty($validated['email']) && Advertisement::query()->where('email', $validated['email'])->where('status', 1)->exists()) {
            return response()->json(['message' => 'Same Email already exists for another active advertisement.'], 422);
        }

        $imgName = '';
        if ($request->hasFile('img')) {
            $imgName = $this->storeImg($request->file('img'));
        }

        $userId = $this->resolveRealUserId($request);
        $mobile = isset($validated['mobile']) ? trim((string) $validated['mobile']) : '';

        $row = Advertisement::query()->create([
            'title' => $validated['title'],
            'company_name' => ucwords(strtolower($validated['company_name'])),
            'brand' => $validated['brand'] ?? '',
            'model' => $validated['model'] ?? '',
            'img_url' => $imgName,
            'ad_url' => $validated['ad_url'],
            'contactperson_name' => ucwords(strtolower($validated['contactperson_name'])),
            'email' => $validated['email'] ?? '',
            'mobile' => $mobile,
            'ad_type' => (int) $validated['ad_type'],
            'category_id' => $categoryId,
            'annual_rates' => $validated['annual_rates'],
            'start_date' => ! empty($validated['start_date']) ? $validated['start_date'] : '1970-01-01',
            'end_date' => ! empty($validated['end_date']) ? $validated['end_date'] : '1970-01-01',
            'status' => (int) $validated['status'],
            'addeddate' => now()->toDateString(),
            'addedby' => $userId,
            'modifieddate' => now()->toDateString(),
            'modifiedby' => $userId,
        ]);

        return response()->json(['message' => 'Advertisement created successfully.', 'data' => $row], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'advertisement', 'allow_edit')) {
            return $deny;
        }

        $row = Advertisement::query()->findOrFail($id);
        $adType = (int) $request->input('ad_type', 0);
        $categoryRules = $adType === 1
            ? ['required', 'integer', Rule::exists('subcategorymst', 'id')->where('status', 1)]
            : ['nullable', 'integer'];

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'company_name' => ['required', 'string', 'max:150'],
            'contactperson_name' => ['required', 'string', 'max:150', 'regex:/^[a-zA-Z.\s]+$/'],
            'ad_url' => ['required', 'url', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'mobile' => ['nullable', 'string', 'max:20'],
            'brand' => ['nullable', 'string', 'max:150'],
            'model' => ['nullable', 'string', 'max:150'],
            'ad_type' => ['required', 'integer', 'in:0,1'],
            'category_id' => $categoryRules,
            'annual_rates' => ['required', 'numeric'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'status' => ['required', 'in:0,1'],
            'img' => ['nullable', 'file', 'image', 'max:5120'],
        ]);

        $categoryId = $adType === 0 ? 0 : (int) $validated['category_id'];

        if (Advertisement::query()->where('id', '!=', $id)->where('contactperson_name', $validated['contactperson_name'])->where('status', 1)->exists()) {
            return response()->json(['message' => 'Same Contact Person Name already exists for another active advertisement.'], 422);
        }
        if (! empty($validated['email']) && Advertisement::query()->where('id', '!=', $id)->where('email', $validated['email'])->where('status', 1)->exists()) {
            return response()->json(['message' => 'Same Email already exists for another active advertisement.'], 422);
        }

        $imgName = $row->img_url;
        if ($request->hasFile('img')) {
            $this->deleteImg($imgName);
            $imgName = $this->storeImg($request->file('img'));
        }

        $userId = $this->resolveRealUserId($request);
        $mobile = isset($validated['mobile']) ? trim((string) $validated['mobile']) : '';

        $row->title = $validated['title'];
        $row->company_name = ucwords(strtolower($validated['company_name']));
        $row->brand = $validated['brand'] ?? '';
        $row->model = $validated['model'] ?? '';
        $row->img_url = $imgName;
        $row->ad_url = $validated['ad_url'];
        $row->contactperson_name = ucwords(strtolower($validated['contactperson_name']));
        $row->email = $validated['email'] ?? '';
        $row->mobile = $mobile;
        $row->ad_type = (int) $validated['ad_type'];
        $row->category_id = $categoryId;
        $row->annual_rates = $validated['annual_rates'];
        $row->start_date = ! empty($validated['start_date']) ? $validated['start_date'] : '1970-01-01';
        $row->end_date = ! empty($validated['end_date']) ? $validated['end_date'] : '1970-01-01';
        $row->status = (int) $validated['status'];
        $row->modifieddate = now()->toDateString();
        $row->modifiedby = $userId;
        $row->save();

        return response()->json(['message' => 'Advertisement updated successfully.', 'data' => $row]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'advertisement', 'allow_delete')) {
            return $deny;
        }

        $row = Advertisement::query()->findOrFail($id);
        $userId = $this->resolveRealUserId($request);
        $row->status = 0;
        $row->modifieddate = now()->toDateString();
        $row->modifiedby = $userId;
        $row->save();

        return response()->json(['message' => 'Advertisement has been marked as inactive.']);
    }

    private function storeImg(\Illuminate\Http\UploadedFile $file): string
    {
        $dir = public_path('images/AdvertiseImages');
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $ext = $file->getClientOriginalExtension() ?: 'png';
        $name = date('YmdHis').'_'.Str::random(8).'.'.$ext;
        $file->move($dir, $name);

        return $name;
    }

    private function deleteImg(?string $filename): void
    {
        if ($filename === null || $filename === '') {
            return;
        }
        $path = public_path('images/AdvertiseImages/'.$filename);
        if (is_file($path)) {
            unlink($path);
        }
    }
}
