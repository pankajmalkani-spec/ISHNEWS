<?php

namespace App\Http\Middleware;

use App\Services\MwadminAccessService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMwadminModulePermission
{
    public function __construct(
        private readonly MwadminAccessService $accessService,
    ) {}

    /**
     * @param  string  $module  access_modules.modulename (e.g. category, dashboard)
     */
    public function handle(Request $request, Closure $next, string $module): Response|RedirectResponse|JsonResponse
    {
        $session = $request->session()->get('ishnews_session');
        if (! is_array($session) || empty($session['validated'])) {
            if ($request->is('api/mwadmin', 'api/mwadmin/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            return redirect()->route('mwadmin.login');
        }

        if (empty($session['modules'])) {
            $session = $this->accessService->mergeModulesIntoSession($session);
            $request->session()->put('ishnews_session', $session);
        }

        if (! empty($session['superaccess'])) {
            return $next($request);
        }

        $modules = $session['modules'] ?? [];
        $flags = $modules[$module] ?? null;
        // Align with mwadminPermissions.canAccessModule: section visible if Access or View is granted.
        $allowed = is_array($flags) && (! empty($flags['allow_access']) || ! empty($flags['allow_view']));

        if ($allowed) {
            return $next($request);
        }

        if ($request->is('api/mwadmin', 'api/mwadmin/*') || $request->expectsJson()) {
            return response()->json(['message' => 'You do not have access to this section.'], 403);
        }

        // Never send users to /dashboard when they lack access — that route re-checks the same permission and loops.
        return redirect()
            ->route('mwadmin.access_denied')
            ->with('error', 'You do not have access to that section.');
    }
}
