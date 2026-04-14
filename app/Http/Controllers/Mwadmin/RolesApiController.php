<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Mwadmin\Concerns\AuthorizesMwadminPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RolesApiController extends Controller
{
    use AuthorizesMwadminPermissions;

    public function options(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'roles', 'allow_view')) {
            return $deny;
        }

        $modules = DB::table('access_modules')
            ->select('moduleid', 'modulename', 'modulelabel', 'modulegroup', 'module_sort', 'sortorder')
            ->where('status', 1)
            ->orderBy('module_sort')
            ->orderBy('sortorder')
            ->get();

        return response()->json(['modules' => $modules]);
    }

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'roles', 'allow_view')) {
            return $deny;
        }

        $perPageParam = (string) $request->query('per_page', '10');
        $allRows = strtolower($perPageParam) === 'all';
        $perPage = $allRows ? 100000 : max(1, min((int) $perPageParam, 100));
        $search = trim((string) $request->query('search', ''));
        $filterName = trim((string) $request->query('filter_name', ''));
        $filterStatus = trim((string) $request->query('filter_status', ''));

        $query = DB::table('access_roles as ar')
            ->leftJoin('usersrole as ur', 'ur.roleid', '=', 'ar.arid')
            ->selectRaw('ar.arid, ar.rolename, ar.description, ar.status, count(distinct ur.userid) as usercount')
            ->where('ar.deleted', 0)
            ->groupBy('ar.arid', 'ar.rolename', 'ar.description', 'ar.status');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('ar.rolename', 'like', "%{$search}%")
                    ->orWhere('ar.description', 'like', "%{$search}%");
            });
        }

        if ($filterName !== '') {
            $query->where(function ($q) use ($filterName): void {
                $q->where('ar.rolename', 'like', "%{$filterName}%")
                    ->orWhere('ar.description', 'like', "%{$filterName}%");
            });
        }

        if ($filterStatus !== '') {
            if (strcasecmp($filterStatus, 'active') === 0) {
                $query->where('ar.status', 1);
            } elseif (strcasecmp($filterStatus, 'in-active') === 0 || strcasecmp($filterStatus, 'inactive') === 0) {
                $query->where('ar.status', 0);
            }
        }

        $paginator = $query->orderBy('ar.arid')->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => collect($paginator->items())->map(fn ($row) => [
                'arid' => (int) $row->arid,
                'rolename' => (string) ($row->rolename ?? ''),
                'description' => (string) ($row->description ?? ''),
                'status' => (int) ($row->status ?? 0),
                'usercount' => (int) ($row->usercount ?? 0),
            ])->values(),
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
        if ($deny = $this->mwadminDenyUnless($request, 'roles', 'allow_add')) {
            return $deny;
        }

        $validated = $request->validate([
            'rolename' => [
                'required',
                'string',
                'max:50',
                'regex:/^[a-zA-Z\s]+$/',
                Rule::unique('access_roles', 'rolename')->where(fn ($q) => $q->where('deleted', 0)),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'in:0,1'],
            'permissions' => ['nullable', 'array'],
            'permissions.*.moduleid' => ['required', 'integer'],
            'permissions.*.allow_access' => ['nullable', 'boolean'],
            'permissions.*.allow_view' => ['nullable', 'boolean'],
            'permissions.*.allow_add' => ['nullable', 'boolean'],
            'permissions.*.allow_edit' => ['nullable', 'boolean'],
            'permissions.*.allow_delete' => ['nullable', 'boolean'],
            'permissions.*.allow_print' => ['nullable', 'boolean'],
            'permissions.*.allow_import' => ['nullable', 'boolean'],
            'permissions.*.allow_export' => ['nullable', 'boolean'],
        ]);

        if ($this->activeModuleCount() > 0 && !$this->permissionsHasAtLeastOne($validated['permissions'] ?? [])) {
            throw ValidationException::withMessages([
                'permissions' => ['Select at least one module permission.'],
            ]);
        }

        $userId = $this->resolveRealUserId($request);
        $now = now();

        $roleId = DB::table('access_roles')->insertGetId([
            'rolename' => trim((string) $validated['rolename']),
            'description' => (string) ($validated['description'] ?? ''),
            'status' => (int) $validated['status'],
            'staff' => 0,
            'addeddate' => $now,
            'addedby' => $userId,
            'modifieddate' => $now,
            'modifiedby' => $userId,
            'deleted' => 0,
        ]);

        $this->syncRolePermissions($roleId, $validated['permissions'] ?? [], $userId);
        return response()->json(['message' => 'Role created successfully.'], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'roles', 'allow_view')) {
            return $deny;
        }

        $role = DB::table('access_roles')
            ->select('arid', 'rolename', 'description', 'status')
            ->where('arid', $id)
            ->where('deleted', 0)
            ->first();
        abort_if(!$role, 404);

        $permissions = DB::table('access_role_modules')
            ->select('moduleid', 'allow_access', 'allow_add', 'allow_view', 'allow_edit', 'allow_delete', 'allow_print', 'allow_import', 'allow_export')
            ->where('roleid', $id)
            ->get()
            ->map(fn ($row) => [
                'moduleid' => (int) $row->moduleid,
                'allow_access' => (int) $row->allow_access === 1,
                'allow_add' => (int) $row->allow_add === 1,
                'allow_view' => (int) $row->allow_view === 1,
                'allow_edit' => (int) $row->allow_edit === 1,
                'allow_delete' => (int) $row->allow_delete === 1,
                'allow_print' => (int) $row->allow_print === 1,
                'allow_import' => (int) $row->allow_import === 1,
                'allow_export' => (int) $row->allow_export === 1,
            ])
            ->values();

        return response()->json([
            'data' => [
                'arid' => (int) $role->arid,
                'rolename' => (string) ($role->rolename ?? ''),
                'description' => (string) ($role->description ?? ''),
                'status' => (int) ($role->status ?? 0),
                'permissions' => $permissions,
            ],
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'roles', 'allow_edit')) {
            return $deny;
        }

        $role = DB::table('access_roles')->where('arid', $id)->where('deleted', 0)->first();
        abort_if(!$role, 404);

        $validated = $request->validate([
            'rolename' => [
                'required',
                'string',
                'max:50',
                'regex:/^[a-zA-Z\s]+$/',
                Rule::unique('access_roles', 'rolename')
                    ->where(fn ($q) => $q->where('deleted', 0))
                    ->ignore($id, 'arid'),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'in:0,1'],
            'permissions' => ['nullable', 'array'],
            'permissions.*.moduleid' => ['required', 'integer'],
            'permissions.*.allow_access' => ['nullable', 'boolean'],
            'permissions.*.allow_view' => ['nullable', 'boolean'],
            'permissions.*.allow_add' => ['nullable', 'boolean'],
            'permissions.*.allow_edit' => ['nullable', 'boolean'],
            'permissions.*.allow_delete' => ['nullable', 'boolean'],
            'permissions.*.allow_print' => ['nullable', 'boolean'],
            'permissions.*.allow_import' => ['nullable', 'boolean'],
            'permissions.*.allow_export' => ['nullable', 'boolean'],
        ]);

        if ($this->activeModuleCount() > 0 && !$this->permissionsHasAtLeastOne($validated['permissions'] ?? [])) {
            throw ValidationException::withMessages([
                'permissions' => ['Select at least one module permission.'],
            ]);
        }

        $userId = $this->resolveRealUserId($request);
        $now = now();

        DB::table('access_roles')->where('arid', $id)->update([
            'rolename' => trim((string) $validated['rolename']),
            'description' => (string) ($validated['description'] ?? ''),
            'status' => (int) $validated['status'],
            'modifieddate' => $now,
            'modifiedby' => $userId,
        ]);

        $this->syncRolePermissions($id, $validated['permissions'] ?? [], $userId);
        return response()->json(['message' => 'Role updated successfully.']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'roles', 'allow_delete')) {
            return $deny;
        }

        $role = DB::table('access_roles')->where('arid', $id)->where('deleted', 0)->first();
        abort_if(!$role, 404);

        if ((int) ($role->status ?? 0) === 0) {
            return response()->json(['message' => 'Role is already inactive.']);
        }

        $userId = $this->resolveRealUserId($request);
        $now = now();

        DB::table('access_roles')->where('arid', $id)->update([
            'status' => 0,
            'modifieddate' => $now,
            'modifiedby' => $userId,
        ]);

        return response()->json(['message' => 'Role has been marked as inactive.']);
    }

    private function activeModuleCount(): int
    {
        return (int) DB::table('access_modules')->where('status', 1)->count();
    }

    private function permissionsHasAtLeastOne(array $permissions): bool
    {
        foreach ($permissions as $perm) {
            if (!is_array($perm)) {
                continue;
            }
            if (
                (bool) ($perm['allow_access'] ?? false)
                || (bool) ($perm['allow_view'] ?? false)
                || (bool) ($perm['allow_add'] ?? false)
                || (bool) ($perm['allow_edit'] ?? false)
                || (bool) ($perm['allow_delete'] ?? false)
                || (bool) ($perm['allow_print'] ?? false)
                || (bool) ($perm['allow_import'] ?? false)
                || (bool) ($perm['allow_export'] ?? false)
            ) {
                return true;
            }
        }

        return false;
    }

    private function syncRolePermissions(int $roleId, array $permissions, int $userId): void
    {
        DB::table('access_role_modules')->where('roleid', $roleId)->delete();

        $now = now();
        foreach ($permissions as $perm) {
            $allowAccess = (bool) ($perm['allow_access'] ?? false);
            $allowView = (bool) ($perm['allow_view'] ?? false);
            $allowAdd = (bool) ($perm['allow_add'] ?? false);
            $allowEdit = (bool) ($perm['allow_edit'] ?? false);
            $allowDelete = (bool) ($perm['allow_delete'] ?? false);
            $allowPrint = (bool) ($perm['allow_print'] ?? false);
            $allowImport = (bool) ($perm['allow_import'] ?? false);
            $allowExport = (bool) ($perm['allow_export'] ?? false);

            if (!($allowAccess || $allowView || $allowAdd || $allowEdit || $allowDelete || $allowPrint || $allowImport || $allowExport)) {
                continue;
            }

            DB::table('access_role_modules')->insert([
                'roleid' => $roleId,
                'moduleid' => (int) $perm['moduleid'],
                'allow_access' => $allowAccess ? 1 : 0,
                'allow_add' => $allowAdd ? 1 : 0,
                'allow_view' => $allowView ? 1 : 0,
                'allow_edit' => $allowEdit ? 1 : 0,
                'allow_delete' => $allowDelete ? 1 : 0,
                'allow_print' => $allowPrint ? 1 : 0,
                'allow_import' => $allowImport ? 1 : 0,
                'allow_export' => $allowExport ? 1 : 0,
                'addeddate' => $now,
                'addedby' => $userId,
            ]);
        }
    }

    private function resolveRealUserId(Request $request): int
    {
        $session = (array) $request->session()->get('ishnews_session', []);
        $sessionUserId = (int) ($session['user_id'] ?? 0);
        if ($sessionUserId > 0 && DB::table('users')->where('userid', $sessionUserId)->exists()) {
            return $sessionUserId;
        }
        $username = (string) ($session['username'] ?? '');
        if ($username !== '') {
            $dbUserId = (int) (DB::table('users')->where('username', $username)->value('userid') ?? 0);
            if ($dbUserId > 0) {
                return $dbUserId;
            }
        }
        return 1;
    }
}
