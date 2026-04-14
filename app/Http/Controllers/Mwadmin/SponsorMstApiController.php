<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Mwadmin\Concerns\AuthorizesMwadminPermissions;
use App\Http\Controllers\Mwadmin\Concerns\ResolvesMwadminUser;
use App\Models\SponsorCategory;
use App\Models\SponsorMst;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SponsorMstApiController extends Controller
{
    use AuthorizesMwadminPermissions;
    use ResolvesMwadminUser;

    private function logoPublicUrl(?string $filename): ?string
    {
        if ($filename === null || $filename === '') {
            return null;
        }

        return '/images/sponsorLogo/'.ltrim($filename, '/');
    }

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'sponsor', 'allow_view')) {
            return $deny;
        }

        $perPageParam = (string) $request->query('per_page', '10');
        $allRows = strtolower($perPageParam) === 'all';
        $perPage = $allRows ? 100000 : max(1, min((int) $perPageParam, 100));
        $search = trim((string) $request->query('search', ''));
        $filterOrg = trim((string) $request->query('filter_organization', ''));
        $filterStatus = trim((string) $request->query('filter_status', ''));

        $query = SponsorMst::query()
            ->from('sponsormst as sm')
            ->select([
                'sm.id',
                'sm.sponsorcategory_id',
                'sc.name as category_name',
                'sm.organization_name',
                'sm.logo',
                'sm.website',
                'sm.contact_name',
                'sm.email',
                'sm.mobile',
                'sm.amount_sponsored',
                'sm.start_date',
                'sm.end_date',
                'sm.status',
            ])
            ->join('sponsorcategory as sc', 'sc.id', '=', 'sm.sponsorcategory_id');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('sm.organization_name', 'like', "%{$search}%")
                    ->orWhere('sm.contact_name', 'like', "%{$search}%")
                    ->orWhere('sm.email', 'like', "%{$search}%")
                    ->orWhere('sc.name', 'like', "%{$search}%");
            });
        }
        if ($filterOrg !== '') {
            $query->where('sm.organization_name', 'like', "%{$filterOrg}%");
        }
        if ($filterStatus !== '') {
            $query->where('sm.status', $filterStatus === 'Active' ? 1 : 0);
        }

        $paginator = $query->orderByDesc('sm.id')->paginate($perPage)->withQueryString();

        $collection = collect($paginator->items())->map(fn ($item) => [
            'id' => $item->id,
            'sponsorcategory_id' => $item->sponsorcategory_id,
            'category_name' => $item->category_name,
            'organization_name' => $item->organization_name,
            'logo' => $item->logo,
            'logo_url' => $this->logoPublicUrl($item->logo),
            'website' => $item->website,
            'contact_name' => $item->contact_name,
            'email' => $item->email,
            'mobile' => $item->mobile,
            'amount_sponsored' => (int) $item->amount_sponsored,
            'start_date' => $item->start_date ? $item->start_date->format('Y-m-d') : null,
            'end_date' => $item->end_date ? $item->end_date->format('Y-m-d') : null,
            'status' => (int) $item->status,
        ])->values();

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
        if ($deny = $this->mwadminDenyUnless($request, 'sponsor', 'allow_view')) {
            return $deny;
        }

        $row = SponsorMst::query()->findOrFail($id);
        $catName = SponsorCategory::query()->where('id', $row->sponsorcategory_id)->value('name');

        return response()->json([
            'data' => [
                'id' => $row->id,
                'sponsorcategory_id' => (string) $row->sponsorcategory_id,
                'category_name' => $catName,
                'organization_name' => $row->organization_name,
                'logo' => $row->logo,
                'logo_url' => $this->logoPublicUrl($row->logo),
                'website' => $row->website,
                'contact_name' => $row->contact_name,
                'email' => $row->email,
                'mobile' => $row->mobile,
                'amount_sponsored' => (int) $row->amount_sponsored,
                'start_date' => $row->start_date ? $row->start_date->format('Y-m-d') : null,
                'end_date' => $row->end_date ? $row->end_date->format('Y-m-d') : null,
                'status' => (int) $row->status,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'sponsor', 'allow_add')) {
            return $deny;
        }

        $validated = $request->validate([
            'sponsorcategory_id' => ['required', 'string', Rule::exists('sponsorcategory', 'id')],
            'organization_name' => ['required', 'string', 'max:250'],
            'website' => ['required', 'url', 'max:150'],
            'contact_name' => ['required', 'string', 'max:200', 'regex:/^[a-zA-Z.\s]+$/'],
            'email' => ['nullable', 'email', 'max:250'],
            'mobile' => ['nullable', 'string', 'max:14'],
            'amount_sponsored' => ['required', 'integer', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'status' => ['required', 'in:0,1'],
            'logo' => ['nullable', 'file', 'image', 'max:5120'],
        ]);

        $contact = $validated['contact_name'];
        if (SponsorMst::query()->where('contact_name', $contact)->where('status', 1)->exists()) {
            return response()->json(['message' => 'Same Contact Name already exists for another active sponsor.'], 422);
        }
        if (! empty($validated['email']) && SponsorMst::query()->where('email', $validated['email'])->where('status', 1)->exists()) {
            return response()->json(['message' => 'Same Email already exists for another active sponsor.'], 422);
        }

        $logoName = '';
        if ($request->hasFile('logo')) {
            $logoName = $this->storeLogoFile($request->file('logo'));
        }

        $userId = $this->resolveRealUserId($request);
        $row = SponsorMst::query()->create([
            'sponsorcategory_id' => (string) $validated['sponsorcategory_id'],
            'organization_name' => ucwords(strtolower($validated['organization_name'])),
            'logo' => $logoName,
            'website' => $validated['website'],
            'contact_name' => ucwords(strtolower($validated['contact_name'])),
            'email' => $validated['email'] ?? '',
            'mobile' => $validated['mobile'] ?? '',
            'amount_sponsored' => $validated['amount_sponsored'],
            'start_date' => ! empty($validated['start_date']) ? $validated['start_date'] : '1970-01-01',
            'end_date' => ! empty($validated['end_date']) ? $validated['end_date'] : '1970-01-01',
            'status' => (int) $validated['status'],
            'addeddate' => now(),
            'addedby' => $userId,
            'modifieddate' => now(),
            'modifiedby' => $userId,
        ]);

        return response()->json(['message' => 'Sponsor created successfully.', 'data' => $row], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'sponsor', 'allow_edit')) {
            return $deny;
        }

        $row = SponsorMst::query()->findOrFail($id);
        $validated = $request->validate([
            'sponsorcategory_id' => ['required', 'string', Rule::exists('sponsorcategory', 'id')],
            'organization_name' => ['required', 'string', 'max:250'],
            'website' => ['required', 'url', 'max:150'],
            'contact_name' => ['required', 'string', 'max:200', 'regex:/^[a-zA-Z.\s]+$/'],
            'email' => ['nullable', 'email', 'max:250'],
            'mobile' => ['nullable', 'string', 'max:14'],
            'amount_sponsored' => ['required', 'integer', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'status' => ['required', 'in:0,1'],
            'logo' => ['nullable', 'file', 'image', 'max:5120'],
        ]);

        if (SponsorMst::query()->where('id', '!=', $id)->where('contact_name', $validated['contact_name'])->where('status', 1)->exists()) {
            return response()->json(['message' => 'Same Contact Name already exists for another active sponsor.'], 422);
        }
        if (! empty($validated['email']) && SponsorMst::query()->where('id', '!=', $id)->where('email', $validated['email'])->where('status', 1)->exists()) {
            return response()->json(['message' => 'Same Email already exists for another active sponsor.'], 422);
        }

        $logoName = $row->logo;
        if ($request->hasFile('logo')) {
            $this->deleteLogoFile($logoName);
            $logoName = $this->storeLogoFile($request->file('logo'));
        }

        $userId = $this->resolveRealUserId($request);
        $row->sponsorcategory_id = (string) $validated['sponsorcategory_id'];
        $row->organization_name = ucwords(strtolower($validated['organization_name']));
        $row->logo = $logoName;
        $row->website = $validated['website'];
        $row->contact_name = ucwords(strtolower($validated['contact_name']));
        $row->email = $validated['email'] ?? '';
        $row->mobile = $validated['mobile'] ?? '';
        $row->amount_sponsored = $validated['amount_sponsored'];
        $row->start_date = ! empty($validated['start_date']) ? $validated['start_date'] : '1970-01-01';
        $row->end_date = ! empty($validated['end_date']) ? $validated['end_date'] : '1970-01-01';
        $row->status = (int) $validated['status'];
        $row->modifieddate = now();
        $row->modifiedby = $userId;
        $row->save();

        return response()->json(['message' => 'Sponsor updated successfully.', 'data' => $row]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'sponsor', 'allow_delete')) {
            return $deny;
        }

        $row = SponsorMst::query()->findOrFail($id);
        $logo = $row->logo;
        $row->delete();
        $this->deleteLogoFile($logo);

        return response()->json(['message' => 'Sponsor deleted successfully.']);
    }

    private function storeLogoFile(\Illuminate\Http\UploadedFile $file): string
    {
        $dir = public_path('images/sponsorLogo');
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $ext = $file->getClientOriginalExtension() ?: 'png';
        $name = date('YmdHis').'_'.Str::random(8).'.'.$ext;
        $file->move($dir, $name);

        return $name;
    }

    private function deleteLogoFile(?string $filename): void
    {
        if ($filename === null || $filename === '') {
            return;
        }
        $path = public_path('images/sponsorLogo/'.$filename);
        if (is_file($path)) {
            unlink($path);
        }
    }
}
