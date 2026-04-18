<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Resolves mwadmin module permissions from legacy tables (same rules as CheckRights in ish_news_helper.php).
 */
class MwadminAccessService
{
    /** Module keys used by Laravel mwadmin routes (matches access_modules.modulename). */
    public const MODULE_KEYS = [
        'dashboard',
        'category',
        'subcategory',
        'sponsorcategory',
        'users',
        'roles',
        'newsletter',
        'newslisting',
        /** Sub-modules for newslisting workflow (legacy CheckRights keys / access_modules.modulename). */
        'p2dprocess',
        'p2dchecklist',
        'texteditor',
        'multimedia',
        'review',
        'schedule',
        'sponsor',
        'advertisement',
        'newsource',
        'designation',
        'flowchart',
    ];

    /**
     * @param  array<string, mixed>  $session
     */
    public function shouldRefreshModules(array $session): bool
    {
        if (empty($session['validated'])) {
            return false;
        }
        $mods = $session['modules'] ?? [];
        if (! is_array($mods) || $mods === []) {
            return true;
        }
        foreach (self::MODULE_KEYS as $key) {
            if (! array_key_exists($key, $mods)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, array<string, int>>
     */
    public function loadModulePermissions(int $userId): array
    {
        $rows = DB::table('access_role_modules as a')
            ->join('usersrole as b', 'a.roleid', '=', 'b.roleid')
            ->join('access_modules as c', 'a.moduleid', '=', 'c.moduleid')
            ->where('b.userid', $userId)
            ->where('c.status', 1)
            ->groupBy('c.modulename')
            ->select([
                'c.modulename',
                DB::raw('IF(SUM(IFNULL(a.allow_access, 0)) > 0, 1, 0) as allow_access'),
                DB::raw('IF(SUM(IFNULL(a.allow_add, 0)) > 0, 1, 0) as allow_add'),
                DB::raw('IF(SUM(IFNULL(a.allow_view, 0)) > 0, 1, 0) as allow_view'),
                DB::raw('IF(SUM(IFNULL(a.allow_edit, 0)) > 0, 1, 0) as allow_edit'),
                DB::raw('IF(SUM(IFNULL(a.allow_delete, 0)) > 0, 1, 0) as allow_delete'),
                DB::raw('IF(SUM(IFNULL(a.allow_print, 0)) > 0, 1, 0) as allow_print'),
                DB::raw('IF(SUM(IFNULL(a.allow_import, 0)) > 0, 1, 0) as allow_import'),
                DB::raw('IF(SUM(IFNULL(a.allow_export, 0)) > 0, 1, 0) as allow_export'),
            ])
            ->get();

        $byName = [];
        foreach ($rows as $row) {
            $name = (string) $row->modulename;
            $byName[$name] = [
                'allow_access' => (int) $row->allow_access,
                'allow_add' => (int) $row->allow_add,
                'allow_view' => (int) $row->allow_view,
                'allow_edit' => (int) $row->allow_edit,
                'allow_delete' => (int) $row->allow_delete,
                'allow_print' => (int) $row->allow_print,
                'allow_import' => (int) $row->allow_import,
                'allow_export' => (int) $row->allow_export,
            ];
        }

        $empty = [
            'allow_access' => 0,
            'allow_add' => 0,
            'allow_view' => 0,
            'allow_edit' => 0,
            'allow_delete' => 0,
            'allow_print' => 0,
            'allow_import' => 0,
            'allow_export' => 0,
        ];

        $out = [];
        foreach (self::MODULE_KEYS as $key) {
            $out[$key] = $byName[$key] ?? $empty;
        }

        return $out;
    }

    /**
     * @return array<string, array<string, int>>
     */
    public static function fullAccessMatrix(): array
    {
        $one = [
            'allow_access' => 1,
            'allow_add' => 1,
            'allow_view' => 1,
            'allow_edit' => 1,
            'allow_delete' => 1,
            'allow_print' => 1,
            'allow_import' => 1,
            'allow_export' => 1,
        ];
        $out = [];
        foreach (self::MODULE_KEYS as $key) {
            $out[$key] = $one;
        }

        return $out;
    }

    /**
     * Ensure session contains a modules matrix (for logins before this feature shipped).
     *
     * @param  array<string, mixed>  $session
     * @return array<string, mixed>
     */
    public function mergeModulesIntoSession(array $session): array
    {
        if (! empty($session['superaccess'])) {
            $session['modules'] = self::fullAccessMatrix();

            return $session;
        }
        $userId = (int) ($session['user_id'] ?? 0);
        if ($userId <= 0) {
            $session['modules'] = array_fill_keys(
                self::MODULE_KEYS,
                [
                    'allow_access' => 0,
                    'allow_add' => 0,
                    'allow_view' => 0,
                    'allow_edit' => 0,
                    'allow_delete' => 0,
                    'allow_print' => 0,
                    'allow_import' => 0,
                    'allow_export' => 0,
                ]
            );

            return $session;
        }
        $session['modules'] = $this->loadModulePermissions($userId);

        return $session;
    }
}
