<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Models\SponsorCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SponsorCategoryApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPageParam = (string) $request->query('per_page', '10');
        $allRows = strtolower($perPageParam) === 'all';
        $perPage = $allRows ? 100000 : max(1, min((int) $perPageParam, 100));
        $search = trim((string) $request->query('search', ''));
        $filterName = trim((string) $request->query('filter_name', ''));
        $filterStatus = trim((string) $request->query('filter_status', ''));

        $query = SponsorCategory::query()->select('id', 'name', 'note', 'status');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%");
            });
        }
        if ($filterName !== '') {
            $query->where('name', 'like', "%{$filterName}%");
        }
        if ($filterStatus !== '') {
            $query->where('status', $filterStatus === 'Active' ? 1 : 0);
        }

        $paginator = $query->orderByDesc('id')->paginate($perPage)->withQueryString();
        $collection = collect($paginator->items())->map(fn ($item) => [
            'id' => $item->id,
            'name' => $item->name,
            'note' => $item->note,
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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:sponsorcategory,name'],
            'note' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'in:0,1'],
        ]);

        $userId = (int) data_get($request->session()->get('ishnews_session', []), 'user_id', 0);
        $row = SponsorCategory::query()->create([
            'name' => $validated['name'],
            'note' => $validated['note'] ?? '',
            'status' => (int) $validated['status'],
            'addeddate' => now(),
            'addedby' => $userId,
            'modifieddate' => now(),
            'modifiedby' => $userId,
        ]);

        return response()->json(['message' => 'Sponsor Category created successfully.', 'data' => $row], 201);
    }

    public function show(int $id): JsonResponse
    {
        $row = SponsorCategory::query()->findOrFail($id);
        return response()->json(['data' => $row]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $row = SponsorCategory::query()->findOrFail($id);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('sponsorcategory', 'name')->ignore($id)],
            'note' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'in:0,1'],
        ]);

        $userId = (int) data_get($request->session()->get('ishnews_session', []), 'user_id', 0);
        $row->name = $validated['name'];
        $row->note = $validated['note'] ?? '';
        $row->status = (int) $validated['status'];
        if (!$row->addeddate) {
            $row->addeddate = now();
        }
        if (!$row->addedby) {
            $row->addedby = $userId;
        }
        $row->modifieddate = now();
        $row->modifiedby = $userId;
        $row->save();

        return response()->json(['message' => 'Sponsor Category updated successfully.', 'data' => $row]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $row = SponsorCategory::query()->findOrFail($id);
        $userId = (int) data_get($request->session()->get('ishnews_session', []), 'user_id', 0);

        if ((int) $row->status === 0) {
            return response()->json([
                'message' => 'Sponsor Category is already inactive.',
            ]);
        }

        $row->status = 0;
        if (!$row->addeddate) {
            $row->addeddate = now();
        }
        if (!$row->addedby) {
            $row->addedby = $userId;
        }
        $row->modifieddate = now();
        $row->modifiedby = $userId;
        $row->save();

        return response()->json([
            'message' => 'Sponsor Category has been marked as inactive.',
        ]);
    }
}