<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get real-time summary statistics for clinic dashboard.
     */
    public function stats(Request $request): JsonResponse
    {
        $today = date('Y-m-d');

        // Total kunjungan hari ini
        $totalKunjunganHariIni = DB::table('kunjungan')
            ->whereDate('tgl_kunjungan', $today)
            ->count();

        // Antrean aktif (menunggu / periksa)
        $antreanAktif = DB::table('kunjungan')
            ->whereDate('tgl_kunjungan', $today)
            ->whereIn('status', ['menunggu', 'periksa'])
            ->count();

        // Resep menunggu farmasi
        $farmasiMenunggu = DB::table('resep')
            ->where('status', 'baru')
            ->count();

        // Billing menunggu pembayaran
        $billingMenunggu = DB::table('kunjungan')
            ->whereDate('tgl_kunjungan', $today)
            ->whereIn('status', ['billing', 'pembayaran'])
            ->count();

        // Kunjungan selesai hari ini
        $selesaiHariIni = DB::table('kunjungan')
            ->whereDate('tgl_kunjungan', $today)
            ->where('status', 'selesai')
            ->count();

        // Total pendapatan kasir valid hari ini
        $pendapatanHariIni = (float) DB::table('pembayaran')
            ->where('status', 'valid')
            ->whereDate('tanggal', $today)
            ->sum('jumlah');

        // Obat dengan stok kritis (<= 10)
        $obatKritis = DB::table('obat as o')
            ->leftJoin('obat_satuan as s', 's.id', '=', 'o.satuan_id')
            ->leftJoin('obat_kategori as k', 'k.id', '=', 'o.kategori_id')
            ->where('o.status', 'aktif')
            ->where('o.stok', '<=', 10)
            ->select('o.id', 'o.kode', 'o.nama', 'o.stok', 's.nama as satuan', 'k.nama as kategori')
            ->orderBy('o.stok', 'asc')
            ->limit(5)
            ->get();

        // 10 Kunjungan terbaru hari ini
        $kunjunganTerbaru = DB::table('kunjungan as k')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->whereDate('k.tgl_kunjungan', $today)
            ->select(
                'k.id',
                'k.no_kunjungan',
                'k.no_antrian',
                'k.tgl_kunjungan',
                'k.status',
                'k.jenis_penjamin',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.jenis_kelamin',
                'p.telepon',
                'po.nama as poli_nama',
                'd.nama as dokter_nama'
            )
            ->orderByDesc('k.id')
            ->limit(10)
            ->get();

        // Breakdown per poli hari ini
        $perPoli = DB::table('kunjungan as k')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->whereDate('k.tgl_kunjungan', $today)
            ->select('po.nama as poli', DB::raw('count(*) as total'))
            ->groupBy('po.nama')
            ->get();

        // 10 Pasien terbaru matching backend/legacy/modules/dashboard/index.php
        $pasienTerbaru = DB::table('pasien as p')
            ->leftJoin('kelompok_pasien as kp', 'kp.id', '=', 'p.kelompok_id')
            ->select(
                'p.id',
                'p.no_mr',
                'p.nama',
                'p.jenis_kelamin',
                'p.tgl_lahir',
                'p.telepon',
                'kp.nama as kelompok'
            )
            ->orderByDesc('p.id')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'tanggal' => $today,
                'pasien_terbaru' => $pasienTerbaru,
                'kpi' => [
                    'total_kunjungan' => $totalKunjunganHariIni,
                    'antrean_aktif' => $antreanAktif,
                    'farmasi_menunggu' => $farmasiMenunggu,
                    'billing_menunggu' => $billingMenunggu,
                    'selesai_hari_ini' => $selesaiHariIni,
                    'pendapatan_hari_ini' => $pendapatanHariIni,
                ],
                'obat_kritis' => $obatKritis,
                'kunjungan_terbaru' => $kunjunganTerbaru,
                'per_poli' => $perPoli,
            ],
        ]);
    }
}
