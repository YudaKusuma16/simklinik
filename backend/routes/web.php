<?php

use App\Http\Controllers\LegacyController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes — SIM Klinik
|--------------------------------------------------------------------------
|
| Backend hanya mengelola:
|   - /          : halaman default Laravel & Vite
|   - /locale    : pengalihan bahasa
|   - /legacy    : backward compatibility untuk modul lama PHP
|
| Semua tampilan aplikasi (login, dashboard, billing, dll) dikelola oleh
| React SPA di frontend/ (http://localhost:5173 atau /app/).
|
| Autentikasi dilakukan melalui API:
|   POST /api/auth/login
|   POST /api/auth/logout
|   GET  /api/auth/me
|
*/

// Root: halaman default Laravel & Vite
Route::get('/', fn () => view('welcome'));

// Pengalihan bahasa/locale (dipertahankan untuk kompatibilitas)
Route::get('/locale/{locale}', [\App\Http\Controllers\LocaleController::class, 'switch'])
    ->name('locale.switch');

// SPA Entry Point
Route::get('/app/{any?}', fn () => file_get_contents(public_path('app/index.html')))->where('any', '.*');

// Legacy fallback proxy (Backward Compatibility dengan modul PHP lama)
Route::match(['get', 'post'], '/legacy/{path}', LegacyController::class)
    ->where('path', '.*')
    ->name('legacy');