<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class ShareFrontendTheme
{
    public function handle(Request $request, Closure $next): Response
    {
        $theme = 'legacy';
        if (config('ish.theme_toggle_enabled')) {
            $theme = (string) $request->cookie('ish_frontend_theme', 'legacy');
            if (! in_array($theme, ['legacy', 'modern'], true)) {
                $theme = 'legacy';
            }
        }

        View::share('frontendTheme', $theme);

        return $next($request);
    }
}
