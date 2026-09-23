<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\KunjunganController;
use App\Http\Controllers\Api\MasterController;
use App\Http\Controllers\Api\PasienController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\WilayahController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — SIM Klinik
|--------------------------------------------------------------------------
*/

// Health Check
Route::get('/up', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Locale Switcher
Route::match(['get', 'post'], '/locale/{locale}', [\App\Http\Controllers\LocaleController::class, 'switch']);

// Authentication (Public)
Route::post('/auth/login', [AuthController::class, 'login']);

// Wilayah Indonesia Autocomplete Search (Public / Auth)
Route::get('/wilayah/search', [WilayahController::class, 'search']);

// Authenticated API Routes
Route::middleware('auth')->group(function () {
    // Current Authenticated User & Logout
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // User Profile (Refactored from backend/legacy/modules/akun/profil.php)
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/password', [ProfileController::class, 'changePassword']);

    // Master Data Management (Fase 2 Refactoring)
    Route::prefix('master')->group(function () {
        Route::get('/entities', [MasterController::class, 'entities']);
        Route::get('/{entity}', [MasterController::class, 'index']);
        Route::get('/{entity}/{id}', [MasterController::class, 'show']);
        Route::post('/{entity}', [MasterController::class, 'store']);
        Route::put('/{entity}/{id}', [MasterController::class, 'update']);
        Route::delete('/{entity}/{id}', [MasterController::class, 'destroy']);
    });

    // Alur Pasien: Pendaftaran Pasien (Fase 3 Refactoring)
    Route::prefix('pasien')->group(function () {
        Route::get('/', [PasienController::class, 'index']);
        Route::get('/{id}', [PasienController::class, 'show'])->whereNumber('id');
        Route::post('/', [PasienController::class, 'store']);
        Route::put('/{id}', [PasienController::class, 'update'])->whereNumber('id');
        Route::delete('/{id}', [PasienController::class, 'destroy'])->whereNumber('id');
    });

    // Alur Pasien: Kunjungan & Antrean Poli (Fase 3 Refactoring)
    Route::prefix('kunjungan')->group(function () {
        Route::get('/', [KunjunganController::class, 'index']);
        Route::get('/lookups', [KunjunganController::class, 'lookups']);
        Route::get('/antrean-rekap', [KunjunganController::class, 'antreanRekap']);
        Route::get('/{id}', [KunjunganController::class, 'show'])->whereNumber('id');
        Route::post('/', [KunjunganController::class, 'store']);
        Route::put('/{id}', [KunjunganController::class, 'update'])->whereNumber('id');
        Route::put('/{id}/status', [KunjunganController::class, 'updateStatus'])->whereNumber('id');
        Route::post('/{id}/batal', [KunjunganController::class, 'batal'])->whereNumber('id');
    });

    // Pelayanan Medis & E-Resep (Fase 4 Refactoring)
    Route::prefix('pelayanan')->group(function () {
        Route::get('/antrean', [\App\Http\Controllers\Api\PelayananController::class, 'antrean']);
        Route::get('/lookups', [\App\Http\Controllers\Api\PelayananController::class, 'lookups']);
        Route::get('/periksa/{kunjungan_id}', [\App\Http\Controllers\Api\PelayananController::class, 'showPeriksa'])->whereNumber('kunjungan_id');
        Route::post('/periksa/{kunjungan_id}', [\App\Http\Controllers\Api\PelayananController::class, 'simpanPeriksa'])->whereNumber('kunjungan_id');
    });

    // Rekam Medis Elektronik (RME)
    Route::get('/rekam-medis/{kunjungan_id}', [\App\Http\Controllers\Api\PelayananController::class, 'detailRme'])->whereNumber('kunjungan_id');

    // Farmasi & Penyerahan Obat (Fase 5 Refactoring)
    Route::prefix('farmasi')->group(function () {
        Route::get('/antrean', [\App\Http\Controllers\Api\FarmasiController::class, 'antrean']);
        Route::get('/resep/{resep_id}', [\App\Http\Controllers\Api\FarmasiController::class, 'showResep'])->whereNumber('resep_id');
        Route::post('/serah/{resep_id}', [\App\Http\Controllers\Api\FarmasiController::class, 'serahkanObat'])->whereNumber('resep_id');
        Route::get('/stok', [\App\Http\Controllers\Api\FarmasiController::class, 'stok']);
        Route::get('/pembelian', [\App\Http\Controllers\Api\FarmasiController::class, 'pembelianIndex']);
        Route::get('/pembelian/lookups', [\App\Http\Controllers\Api\FarmasiController::class, 'pembelianLookups']);
        Route::post('/pembelian', [\App\Http\Controllers\Api\FarmasiController::class, 'pembelianStore']);
        Route::get('/penyesuaian', [\App\Http\Controllers\Api\FarmasiController::class, 'penyesuaianIndex']);
        Route::post('/penyesuaian', [\App\Http\Controllers\Api\FarmasiController::class, 'penyesuaianStore']);
    });

    // Kasir, Billing & Pembayaran (Fase 5 Refactoring)
    Route::prefix('billing')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\BillingController::class, 'index']);
        Route::get('/proses/{kunjungan_id}', [\App\Http\Controllers\Api\BillingController::class, 'showProses'])->whereNumber('kunjungan_id');
        Route::post('/simpan/{kunjungan_id}', [\App\Http\Controllers\Api\BillingController::class, 'simpanBilling'])->whereNumber('kunjungan_id');
        Route::post('/bayar/{kunjungan_id}', [\App\Http\Controllers\Api\BillingController::class, 'bayar'])->whereNumber('kunjungan_id');
        Route::get('/invoice/{kunjungan_id}', [\App\Http\Controllers\Api\BillingController::class, 'showInvoice'])->whereNumber('kunjungan_id');
    });

    // Dashboard Stats & Clinic Overview (Fase 6 Refactoring)
    Route::get('/dashboard/stats', [\App\Http\Controllers\Api\DashboardController::class, 'stats']);

    // Laporan & Rekapitulasi (Fase 6 Refactoring)
    Route::prefix('laporan')->group(function () {
        Route::get('/summary', [\App\Http\Controllers\Api\LaporanController::class, 'summary']);
        Route::get('/{jenis}', [\App\Http\Controllers\Api\LaporanController::class, 'showReport']);
    });

    // Pengaturan: Profil Klinik
    Route::get('/settings/clinic', [\App\Http\Controllers\Api\SettingController::class, 'clinicShow']);
    Route::post('/settings/clinic', [\App\Http\Controllers\Api\SettingController::class, 'clinicUpdate']);

    // Pengaturan: Pengguna & Role
    Route::prefix('users')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\UserController::class, 'index']);
        Route::get('/meta', [\App\Http\Controllers\Api\UserController::class, 'meta']);
        Route::get('/{id}', [\App\Http\Controllers\Api\UserController::class, 'show'])->whereNumber('id');
        Route::post('/', [\App\Http\Controllers\Api\UserController::class, 'store']);
        Route::put('/{id}', [\App\Http\Controllers\Api\UserController::class, 'update'])->whereNumber('id');
        Route::delete('/{id}', [\App\Http\Controllers\Api\UserController::class, 'destroy'])->whereNumber('id');
    });
});



