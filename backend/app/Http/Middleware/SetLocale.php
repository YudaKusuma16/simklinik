<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /** @var list<string> */
    public const SUPPORTED = ['id', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->query('lang')
            ?? session('locale')
            ?? $request->cookie('locale')
            ?? $request->header('X-Locale')
            ?? config('app.locale', 'id');

        if (! in_array($locale, self::SUPPORTED, true)) {
            $locale = 'id';
        }

        session(['locale' => $locale]);
        App::setLocale($locale);

        if (session_status() !== PHP_SESSION_ACTIVE && ! headers_sent()) {
            @session_start();
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION['locale'] = $locale;
        }

        return $next($request);
    }
}
