<?php

namespace App\Http\Controllers;

use App\Http\Middleware\SetLocale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LocaleController extends Controller
{
    public function switch(Request $request, string $locale): Response
    {
        if (! in_array($locale, SetLocale::SUPPORTED, true)) {
            abort(404);
        }

        session(['locale' => $locale]);

        if (session_status() !== PHP_SESSION_ACTIVE && ! headers_sent()) {
            @session_start();
        }
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION['locale'] = $locale;
        }

        $cookie = cookie()->forever('locale', $locale);

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'locale' => $locale,
            ])->withCookie($cookie);
        }

        $fallback = url()->previous();
        if (! $fallback || $fallback === url()->current() || str_contains($fallback, '/locale/')) {
            $fallback = '/legacy/modules/dashboard/index.php';
        }

        return redirect()->to($fallback)->withCookie($cookie);
    }
}
