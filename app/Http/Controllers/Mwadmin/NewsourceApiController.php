<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Mwadmin\Concerns\AuthorizesMwadminPermissions;
use App\Http\Controllers\Mwadmin\Concerns\ResolvesMwadminUser;
use App\Models\Newsource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NewsourceApiController extends Controller
{
    use AuthorizesMwadminPermissions;
    use ResolvesMwadminUser;

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newsource', 'allow_view')) {
            return $deny;
        }

        $perPageParam = (string) $request->query('per_page', '10');
        $allRows = strtolower($perPageParam) === 'all';
        $perPage = $allRows ? 100000 : max(1, min((int) $perPageParam, 100));
        $search = trim((string) $request->query('search', ''));
        $filterName = trim((string) $request->query('filter_name', ''));
        $filterStatus = trim((string) $request->query('filter_status', ''));

        $query = Newsource::query()->select('id', 'name', 'description', 'status');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
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
            'description' => $item->description,
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
        if ($deny = $this->mwadminDenyUnless($request, 'newsource', 'allow_add')) {
            return $deny;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('newsource', 'name')->where(fn ($q) => $q->where('status', 1))],
            'description' => ['nullable', 'string', 'max:80'],
            'status' => ['required', 'in:0,1'],
        ]);

        $userId = $this->resolveRealUserId($request);
        $row = Newsource::query()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'status' => (int) $validated['status'],
            'addeddate' => now(),
            'addedby' => $userId,
            'modifieddate' => now(),
            'modifiedby' => $userId,
        ]);

        return response()->json(['message' => 'News Source created successfully.', 'data' => $row], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newsource', 'allow_view')) {
            return $deny;
        }

        $row = Newsource::query()->findOrFail($id);

        return response()->json(['data' => $row]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newsource', 'allow_edit')) {
            return $deny;
        }

        $row = Newsource::query()->findOrFail($id);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('newsource', 'name')->ignore($id)->where(fn ($q) => $q->where('status', 1))],
            'description' => ['nullable', 'string', 'max:80'],
            'status' => ['required', 'in:0,1'],
        ]);

        $userId = $this->resolveRealUserId($request);
        $row->name = $validated['name'];
        $row->description = $validated['description'] ?? '';
        $row->status = (int) $validated['status'];
        $row->modifieddate = now();
        $row->modifiedby = $userId;
        $row->save();

        return response()->json(['message' => 'News Source updated successfully.', 'data' => $row]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newsource', 'allow_delete')) {
            return $deny;
        }

        Newsource::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'News Source deleted successfully.']);
    }
}
