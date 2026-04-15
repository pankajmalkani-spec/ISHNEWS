<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Services\MwadminAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function loginForm(): Response
    {
        return Inertia::render('Mwadmin/Login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $username = trim($credentials['username']);
        $password = trim($credentials['password']);

        $payload = $this->buildIshnewsSessionPayload($username, $password);
        if ($payload === null) {
            return back()->withErrors([
                'username' => 'Invalid username/password. Try again.',
            ])->onlyInput('username');
        }

        $session = $payload;
        if (empty($session['modules'])) {
            $session = app(MwadminAccessService::class)->mergeModulesIntoSession($session);
        }
        $request->session()->put('ishnews_session', $session);

        return redirect()->route($this->intendedRouteNameAfterLogin($session));
    }

    public function loginApi(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $username = trim($credentials['username']);
        $password = trim($credentials['password']);

        $payload = $this->buildIshnewsSessionPayload($username, $password);
        if ($payload === null) {
            return response()->json(['message' => 'Invalid username/password.'], 422);
        }

        $request->session()->put('ishnews_session', $payload);

        $session = $payload;
        if (empty($session['modules'])) {
            $session = app(MwadminAccessService::class)->mergeModulesIntoSession($session);
            $request->session()->put('ishnews_session', $session);
        }

        return response()->json([
            'ok' => true,
            'user' => $this->authUserFromSession($session),
            'intended' => route($this->intendedRouteNameAfterLogin($session)),
        ]);
    }

    public function meApi(Request $request): JsonResponse
    {
        $session = $request->session()->get('ishnews_session');
        if (! is_array($session) || empty($session['validated'])) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (empty($session['modules'])) {
            $session = app(MwadminAccessService::class)->mergeModulesIntoSession($session);
            $request->session()->put('ishnews_session', $session);
        }

        return response()->json(['user' => $this->authUserFromSession($session)]);
    }

    public function logoutApi(Request $request): JsonResponse
    {
        $request->session()->forget('ishnews_session');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->session()->forget('ishnews_session');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('mwadmin.login');
    }

    /**
     * @return array<string, mixed>|null
     */
    private function buildIshnewsSessionPayload(string $username, string $password): ?array
    {
        $masterHash = DB::table('hash')->where('username', $username)->value('password');
        if ($this->matchesLegacyHash($password, $masterHash)) {
            return [
                'login_type' => '1',
                'user_id' => '999999999',
                'username' => $username,
                'first_name' => 'Super',
                'last_name' => 'Administrator',
                'role' => 1,
                'user_type' => 1,
                'validated' => true,
                'superaccess' => true,
            ];
        }

        $user = DB::table('users')->where('username', $username)->first();
        if ($user && $this->matchesLegacyHash($password, $user->password ?? null)) {
            return [
                'login_type' => (string) ($user->userid ?? ''),
                'user_id' => (string) ($user->userid ?? ''),
                'username' => $user->username ?? $username,
                'first_name' => $user->first_name ?? '',
                'last_name' => $user->last_name ?? '',
                'profile_photo' => $user->profile_photo ?? null,
                'role' => $user->role ?? null,
                'user_type' => $user->user_type ?? null,
                'validated' => true,
                'superaccess' => ($user->username ?? '') === 'superadmin',
            ];
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $session
     * @return array<string, mixed>
     */
    /**
     * First module the user may open after login (avoids redirecting everyone to Dashboard when they lack that right).
     *
     * @param  array<string, mixed>  $session
     */
    private function intendedRouteNameAfterLogin(array $session): string
    {
        if (! empty($session['superaccess'])) {
            return 'mwadmin.dashboard';
        }

        $modules = $session['modules'] ?? [];
        foreach (MwadminAccessService::MODULE_KEYS as $key) {
            $flags = $modules[$key] ?? null;
            if (is_array($flags) && ! empty($flags['allow_access'])) {
                return match ($key) {
                    'dashboard' => 'mwadmin.dashboard',
                    'category' => 'mwadmin.category.index',
                    'subcategory' => 'mwadmin.subcategory.index',
                    'sponsorcategory' => 'mwadmin.sponsorcategory.index',
                    'users' => 'mwadmin.users.index',
                    'roles' => 'mwadmin.roles.index',
                    'newsletter' => 'mwadmin.newsletter.index',
                    'newslisting' => 'mwadmin.newslisting.index',
                    'schedule' => 'mwadmin.schedule.index',
                    'sponsor' => 'mwadmin.sponsor.index',
                    'advertisement' => 'mwadmin.advertisement.index',
                    'newsource' => 'mwadmin.newsource.index',
                    'designation' => 'mwadmin.designation.index',
                    'flowchart' => 'mwadmin.flowchart.index',
                    default => 'mwadmin.access_denied',
                };
            }
        }

        return 'mwadmin.access_denied';
    }

    /**
     * @param  array<string, mixed>  $session
     * @return array<string, mixed>
     */
    private function authUserFromSession(array $session): array
    {
        return [
            'username' => (string) ($session['username'] ?? ''),
            'first_name' => (string) ($session['first_name'] ?? ''),
            'last_name' => (string) ($session['last_name'] ?? ''),
            'superaccess' => (bool) ($session['superaccess'] ?? false),
            'modules' => (array) ($session['modules'] ?? []),
        ];
    }

    private function matchesLegacyHash(string $plain, ?string $stored): bool
    {
        if (! is_string($stored) || strlen($stored) < 8) {
            return false;
        }

        $salt = substr($stored, 0, 8);

        return hash_equals($stored, $salt.md5($salt.$plain));
    }
}
