<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes — SIM RS
|--------------------------------------------------------------------------
|
| Pintu gerbang utama menyajikan React 19 Single Page Application (SPA).
| Seluruh rute aplikasi (login, dashboard, pasien, kunjungan, pelayanan,
| rekam medis, farmasi, billing, master data, laporan, dan pengaturan)
| dikelola oleh React Router di frontend.
|
*/

// Root: halaman default Laravel & Vite
Route::get('/', fn () => view('welcome'));

// Pengalihan bahasa/locale
Route::get('/locale/{locale}', [\App\Http\Controllers\LocaleController::class, 'switch'])
    ->name('locale.switch');

// SPA Entry Point
Route::get('/app/{any?}', function () {
    $indexPath = public_path('app/index.html');
    if (! file_exists($indexPath)) {
        return response("Aplikasi frontend belum di-build. Silakan jalankan 'npm run build' di folder frontend terlebih dahulu.", 503);
    }
    return file_get_contents($indexPath);
})->where('any', '.*')->name('spa');