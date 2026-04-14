<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Mwadmin\Concerns\AuthorizesMwadminPermissions;
use App\Http\Controllers\Mwadmin\Concerns\ResolvesMwadminUser;
use App\Models\FlowchartMst;
use App\Models\FlowchartTrans;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FlowchartApiController extends Controller
{
    use AuthorizesMwadminPermissions;
    use ResolvesMwadminUser;

    public function options(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'flowchart', 'allow_view')) {
            return $deny;
        }

        $users = DB::table('users')
            ->where('status', 1)
            ->orderBy('first_name')
            ->get([
                'userid as id',
                DB::raw("CONCAT(COALESCE(first_name,''),' ',COALESCE(last_name,'')) as name"),
            ]);

        $designations = DB::table('designation')
            ->where('status', 1)
            ->orderBy('designation')
            ->get(['id', 'designation']);

        return response()->json([
            'users' => $users,
            'designations' => $designations,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'flowchart', 'allow_view')) {
            return $deny;
        }

        $perPageParam = (string) $request->query('per_page', '10');
        $allRows = strtolower($perPageParam) === 'all';
        $perPage = $allRows ? 100000 : max(1, min((int) $perPageParam, 100));
        $search = trim((string) $request->query('search', ''));
        $filterName = trim((string) $request->query('filter_name', ''));
        $filterStatus = trim((string) $request->query('filter_status', ''));

        $query = DB::table('flowchartmst as f')
            ->leftJoin('users as u', 'u.userid', '=', 'f.defined_by')
            ->select([
                'f.id',
                'f.name as flowchart_name',
                'f.description',
                DB::raw("CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) as defined_by_name"),
                'f.status',
            ]);

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('f.name', 'like', "%{$search}%")
                    ->orWhere('f.description', 'like', "%{$search}%");
            });
        }
        if ($filterName !== '') {
            $query->where('f.name', 'like', "%{$filterName}%");
        }
        if ($filterStatus !== '') {
            $query->where('f.status', $filterStatus === 'Active' ? 1 : 0);
        }

        $paginator = $query->orderByDesc('f.id')->paginate($perPage)->withQueryString();

        $collection = collect($paginator->items())->map(fn ($item) => [
            'id' => $item->id,
            'flowchart_name' => $item->flowchart_name,
            'description' => $item->description,
            'defined_by_name' => trim((string) $item->defined_by_name),
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
        if ($deny = $this->mwadminDenyUnless($request, 'flowchart', 'allow_view')) {
            return $deny;
        }

        $m = FlowchartMst::query()->findOrFail($id);
        $def = DB::table('users')->where('userid', $m->defined_by)->first();
        $defName = $def ? trim(($def->first_name ?? '').' '.($def->last_name ?? '')) : '';

        $lines = FlowchartTrans::query()
            ->where('charttrans_id', $id)
            ->where('contentedit_id', 0)
            ->orderBy('sort')
            ->get(['id', 'plan', 'activity_name', 'responsibilty', 'sort']);

        $desigs = DB::table('designation')->pluck('designation', 'id');

        $activities = $lines->map(fn ($row) => [
            'id' => $row->id,
            'plan' => (int) $row->plan,
            'activity_name' => $row->activity_name,
            'responsibility_id' => (int) $row->responsibilty,
            'responsibility_name' => $desigs[(int) $row->responsibilty] ?? '',
            'sort' => (int) $row->sort,
        ])->values();

        return response()->json([
            'data' => [
                'id' => $m->id,
                'name' => $m->name,
                'description' => $m->description,
                'defined_by' => (int) $m->defined_by,
                'defined_by_name' => $defName,
                'status' => (int) $m->status,
                'activities' => $activities,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'flowchart', 'allow_add')) {
            return $deny;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200', Rule::unique('flowchartmst', 'name')->where(fn ($q) => $q->where('status', 1))],
            'description' => ['nullable', 'string', 'max:200'],
            'defined_by' => ['required', 'integer', Rule::exists('users', 'userid')],
            'status' => ['required', 'in:0,1'],
            'activities' => ['required', 'array', 'min:1'],
            'activities.*.plan' => ['required', 'integer', 'in:1,2,3'],
            'activities.*.activity_name' => ['required', 'string', 'max:200'],
            'activities.*.responsibility_id' => ['required', 'integer', Rule::exists('designation', 'id')],
            'activities.*.sort' => ['required', 'integer', 'min:0'],
        ]);

        if (FlowchartMst::query()->where('name', $validated['name'])->where('status', 1)->exists()) {
            return response()->json(['message' => 'Same Flow Chart Name already exists.'], 422);
        }

        $userId = $this->resolveRealUserId($request);

        return DB::transaction(function () use ($validated, $userId) {
            $m = FlowchartMst::query()->create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? '',
                'defined_by' => $validated['defined_by'],
                'status' => (int) $validated['status'],
                'addeddate' => now(),
                'addedby' => $userId,
                'modifieddate' => now(),
                'modifiedby' => $userId,
            ]);

            foreach ($validated['activities'] as $act) {
                FlowchartTrans::query()->create([
                    'charttrans_id' => $m->id,
                    'contentedit_id' => 0,
                    'plan' => $act['plan'],
                    'activity_name' => $act['activity_name'],
                    'responsibilty' => $act['responsibility_id'],
                    'sort' => $act['sort'],
                    'modifieddate' => now(),
                    'modifiedby' => $userId,
                ]);
            }

            return response()->json(['message' => 'Flow Chart created successfully.', 'data' => ['id' => $m->id]], 201);
        });
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'flowchart', 'allow_edit')) {
            return $deny;
        }

        $m = FlowchartMst::query()->findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200', Rule::unique('flowchartmst', 'name')->ignore($id)->where(fn ($q) => $q->where('status', 1))],
            'description' => ['nullable', 'string', 'max:200'],
            'defined_by' => ['required', 'integer', Rule::exists('users', 'userid')],
            'status' => ['required', 'in:0,1'],
            'activities' => ['required', 'array', 'min:1'],
            'activities.*.plan' => ['required', 'integer', 'in:1,2,3'],
            'activities.*.activity_name' => ['required', 'string', 'max:200'],
            'activities.*.responsibility_id' => ['required', 'integer', Rule::exists('designation', 'id')],
            'activities.*.sort' => ['required', 'integer', 'min:0'],
        ]);

        $userId = $this->resolveRealUserId($request);

        return DB::transaction(function () use ($m, $validated, $userId, $id) {
            $m->name = $validated['name'];
            $m->description = $validated['description'] ?? '';
            $m->defined_by = $validated['defined_by'];
            $m->status = (int) $validated['status'];
            $m->modifieddate = now();
            $m->modifiedby = $userId;
            $m->save();

            FlowchartTrans::query()->where('charttrans_id', $id)->where('contentedit_id', 0)->delete();

            foreach ($validated['activities'] as $act) {
                FlowchartTrans::query()->create([
                    'charttrans_id' => $id,
                    'contentedit_id' => 0,
                    'plan' => $act['plan'],
                    'activity_name' => $act['activity_name'],
                    'responsibilty' => $act['responsibility_id'],
                    'sort' => $act['sort'],
                    'modifieddate' => now(),
                    'modifiedby' => $userId,
                ]);
            }

            return response()->json(['message' => 'Flow Chart updated successfully.', 'data' => $m]);
        });
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'flowchart', 'allow_delete')) {
            return $deny;
        }

        $used = DB::table('contentcharttrans')->where('charttrans_id', $id)->exists();
        if ($used) {
            return response()->json(['message' => 'Flow Chart cannot be deleted; it is assigned in News Content.'], 422);
        }

        DB::transaction(function () use ($id): void {
            FlowchartTrans::query()->where('charttrans_id', $id)->delete();
            FlowchartMst::query()->where('id', $id)->delete();
        });

        return response()->json(['message' => 'Flow Chart deleted successfully.']);
    }
}
