<?php

use App\Http\Controllers\LegacyController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes — SIM Klinik
|--------------------------------------------------------------------------
|
| Backend hanya mengelola:
|   - /locale    : pengalihan bahasa (digunakan oleh frontend jika diperlukan)
|   - /legacy    : backward compatibility untuk modul lama PHP
|
| Semua tampilan (login, dashboard, dll) kini dikelola oleh
| React SPA di folder frontend/ (http://localhost:5173).
|
| Autentikasi dilakukan melalui API:
|   POST /api/auth/login
|   POST /api/auth/logout
|   GET  /api/auth/me
|
*/

// Root: tampilkan halaman default Laravel (API-only indicator)
// Semua tampilan aplikasi ada di frontend/ (http://localhost:5173)
Route::get('/', fn () => view('welcome'));

// Pengalihan bahasa/locale (dipertahankan untuk kompatibilitas)
Route::get('/locale/{locale}', [\App\Http\Controllers\LocaleController::class, 'switch'])
    ->name('locale.switch');

// Legacy fallback proxy (Backward Compatibility dengan modul PHP lama)
Route::middleware('auth')->group(function () {
    Route::match(['get', 'post'], '/legacy/{path}', LegacyController::class)
        ->where('path', '.*')
        ->name('legacy');
});
