<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class FarmasiController extends Controller
{
    /**
     * Daftar antrean resep obat yang siap disiapkan/diserahkan oleh apoteker
     */
    public function antrean(Request $request): JsonResponse
    {
        $rows = DB::table('resep as r')
            ->join('kunjungan as k', 'k.id', '=', 'r.kunjungan_id')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'r.dokter_id')
            ->select(
                'k.id as kunjungan_id',
                'k.no_kunjungan',
                'k.no_antrian',
                'k.tgl_kunjungan',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.alergi as pasien_alergi',
                'po.kode as poli_kode',
                'po.nama as poli_nama',
                'd.nama as dokter_nama',
                'r.id as resep_id',
                'r.status as resep_status',
                'r.catatan as resep_catatan',
                'r.tanggal as resep_tanggal',
                DB::raw('(SELECT COUNT(*) FROM resep_detail rd WHERE rd.resep_id = r.id) as jml_obat')
            )
            ->where('k.status', 'farmasi')
            ->whereIn('r.status', ['baru', 'disiapkan'])
            ->orderBy('k.tgl_kunjungan')
            ->orderBy('k.no_antrian')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $rows,
            'total' => $rows->count(),
        ]);
    }

    /**
     * Detail satu resep beserta item obat dan pengecekan stok
     */
    public function showResep(int $resepId): JsonResponse
    {
        $resep = DB::table('resep as r')
            ->join('kunjungan as k', 'k.id', '=', 'r.kunjungan_id')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'r.dokter_id')
            ->select(
                'r.*',
                'k.id as kunjungan_id',
                'k.no_kunjungan',
                'k.no_antrian',
                'k.status as kunjungan_status',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.alergi as pasien_alergi',
                'po.nama as poli_nama',
                'd.nama as dokter_nama'
            )
            ->where('r.id', $resepId)
            ->first();

        if (! $resep) {
            return response()->json(['success' => false, 'message' => 'Resep tidak ditemukan.'], 404);
        }

        $items = DB::table('resep_detail as rd')
            ->join('obat as o', 'o.id', '=', 'rd.obat_id')
            ->leftJoin('obat_satuan as s', 's.id', '=', 'o.satuan_id')
            ->select(
                'rd.*',
                'o.kode as obat_kode',
                'o.nama as obat_nama',
                'o.stok as obat_stok',
                's.nama as satuan_nama'
            )
            ->where('rd.resep_id', $resepId)
            ->get();

        $insufficient = [];
        $totalBiaya = 0;

        foreach ($items as $item) {
            $totalBiaya += (float) $item->subtotal;
            if ($item->qty > $item->obat_stok) {
                $insufficient[] = [
                    'obat_id' => $item->obat_id,
                    'nama' => $item->obat_nama,
                    'butuh' => $item->qty,
                    'stok' => $item->obat_stok,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'resep' => $resep,
            'items' => $items,
            'total_biaya' => $totalBiaya,
            'stok_cukup' => empty($insufficient),
            'stok_kurang' => $insufficient,
        ]);
    }

    /**
     * Penyerahan obat oleh farmasi:
     * - Memotong stok obat
     * - Mencatat mutasi stok
     * - Mengubah status resep ke 'diserahkan'
     * - Mengubah status kunjungan ke 'billing' (siap bayar di kasir)
     */
    public function serahkanObat(Request $request, int $resepId): JsonResponse
    {
        $resep = DB::table('resep as r')
            ->join('kunjungan as k', 'k.id', '=', 'r.kunjungan_id')
            ->select('r.*', 'k.no_kunjungan')
            ->where('r.id', $resepId)
            ->first();

        if (! $resep) {
            return response()->json(['success' => false, 'message' => 'Resep tidak ditemukan.'], 404);
        }

        if ($resep->status === 'diserahkan') {
            return response()->json(['success' => false, 'message' => 'Resep ini sudah pernah diserahkan sebelumnya.'], 422);
        }

        $items = DB::table('resep_detail as rd')
            ->join('obat as o', 'o.id', '=', 'rd.obat_id')
            ->select('rd.*', 'o.nama as obat_nama', 'o.stok as obat_stok')
            ->where('rd.resep_id', $resepId)
            ->get();

        // Validasi ketersediaan stok
        $kurang = [];
        foreach ($items as $item) {
            if ($item->qty > $item->obat_stok) {
                $kurang[] = "{$item->obat_nama} (butuh {$item->qty}, stok {$item->obat_stok})";
            }
        }

        if (! empty($kurang)) {
            return response()->json([
                'success' => false,
                'message' => 'Stok obat tidak mencukupi: ' . implode(', ', $kurang),
            ], 422);
        }

        $userId = $request->user()?->id;

        try {
            DB::beginTransaction();

            foreach ($items as $item) {
                $stokAkhir = (int) $item->obat_stok - (int) $item->qty;

                // Potong stok obat
                DB::table('obat')->where('id', $item->obat_id)->update([
                    'stok' => $stokAkhir,
                ]);

                // Catat riwayat mutasi stok
                DB::table('stok_mutasi')->insert([
                    'obat_id' => $item->obat_id,
                    'tanggal' => now(),
                    'jenis' => 'keluar',
                    'qty' => -(int) $item->qty,
                    'stok_akhir' => $stokAkhir,
                    'ref_tabel' => 'resep',
                    'ref_id' => $resepId,
                    'keterangan' => 'Penyerahan resep ' . $resep->no_kunjungan,
                    'user_id' => $userId,
                ]);
            }

            // Update status resep
            DB::table('resep')->where('id', $resepId)->update([
                'status' => 'diserahkan',
            ]);

            // Teruskan kunjungan ke kasir / billing
            DB::table('kunjungan')->where('id', $resep->kunjungan_id)->update([
                'status' => 'billing',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Obat berhasil diserahkan. Kunjungan telah diteruskan ke Kasir / Billing untuk pembayaran.',
            ]);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyerahkan obat: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Katalog stok obat untuk monitoring farmasi
     */
    public function stok(Request $request): JsonResponse
    {
        $search = trim($request->query('q', ''));
        $query = DB::table('obat as o')
            ->leftJoin('obat_kategori as k', 'k.id', '=', 'o.kategori_id')
            ->leftJoin('obat_satuan as s', 's.id', '=', 'o.satuan_id')
            ->select(
                'o.*',
                DB::raw('CASE WHEN o.harga_jual > 0 THEN o.harga_jual ELSE ROUND(o.harga_beli + (o.harga_beli * COALESCE(o.markup_persen, 0) / 100), 0) END as harga_jual'),
                'k.nama as kategori_nama',
                's.nama as satuan_nama'
            )
            ->where('o.status', 'aktif');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('o.nama', 'LIKE', "%{$search}%")
                  ->orWhere('o.kode', 'LIKE', "%{$search}%");
            });
        }

        $obatList = $query->orderBy('o.nama')->get();

        return response()->json([
            'success' => true,
            'data' => $obatList,
            'total' => $obatList->count(),
        ]);
    }

    /**
     * Daftar riwayat pembelian obat masuk
     */
    public function pembelianIndex(): JsonResponse
    {
        $rows = DB::table('pembelian as pb')
            ->leftJoin('supplier as s', 's.id', '=', 'pb.supplier_id')
            ->select(
                'pb.id',
                'pb.no_beli',
                'pb.tanggal',
                'pb.total',
                'pb.keterangan',
                's.nama as supplier',
                DB::raw('(SELECT COUNT(*) FROM pembelian_detail d WHERE d.pembelian_id = pb.id) as jml')
            )
            ->orderBy('pb.id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $rows,
            'total' => $rows->count(),
        ]);
    }

    /**
     * Lookups supplier dan obat untuk form pembelian baru
     */
    public function pembelianLookups(): JsonResponse
    {
        $suppliers = DB::table('supplier')->orderBy('nama')->get();
        $obat = DB::table('obat')
            ->where('status', 'aktif')
            ->select('id', 'kode', 'nama', 'harga_beli', 'stok')
            ->orderBy('nama')
            ->get();

        return response()->json([
            'success' => true,
            'suppliers' => $suppliers,
            'obat' => $obat,
        ]);
    }

    /**
     * Simpan transaksi pembelian obat & perbarui stok
     */
    public function pembelianStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => ['nullable', 'integer', 'exists:supplier,id'],
            'tanggal' => ['required', 'date'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.obat_id' => ['required', 'integer', 'exists:obat,id'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.harga_beli' => ['required', 'numeric', 'min:0'],
            'items.*.no_batch' => ['nullable', 'string', 'max:50'],
            'items.*.tgl_expired' => ['nullable', 'date'],
        ]);

        $userId = $request->user()?->id;

        try {
            DB::beginTransaction();

            $total = 0;
            foreach ($validated['items'] as $it) {
                $total += (int) $it['qty'] * (float) $it['harga_beli'];
            }

            $tgl = date('Ymd', strtotime($validated['tanggal']));
            $like = 'BELI-' . $tgl . '-%';
            $count = DB::table('pembelian')->where('no_beli', 'LIKE', $like)->count() + 1;
            $noBeli = sprintf('BELI-%s-%04d', $tgl, $count);

            $pembelianId = DB::table('pembelian')->insertGetId([
                'no_beli' => $noBeli,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'tanggal' => $validated['tanggal'],
                'total' => $total,
                'keterangan' => $validated['keterangan'] ?? null,
                'user_id' => $userId,
                'created_at' => now(),
            ]);

            foreach ($validated['items'] as $it) {
                $sub = (int) $it['qty'] * (float) $it['harga_beli'];
                $batch = !empty($it['no_batch']) ? trim($it['no_batch']) : null;
                $exp = !empty($it['tgl_expired']) ? $it['tgl_expired'] : null;

                DB::table('pembelian_detail')->insert([
                    'pembelian_id' => $pembelianId,
                    'obat_id' => $it['obat_id'],
                    'no_batch' => $batch,
                    'tgl_expired' => $exp,
                    'qty' => (int) $it['qty'],
                    'harga_beli' => (float) $it['harga_beli'],
                    'subtotal' => $sub,
                ]);

                DB::table('obat_batch')->insert([
                    'obat_id' => $it['obat_id'],
                    'no_batch' => $batch,
                    'tgl_expired' => $exp,
                    'stok' => (int) $it['qty'],
                    'harga_beli' => (float) $it['harga_beli'],
                ]);

                DB::table('obat')->where('id', $it['obat_id'])->increment('stok', (int) $it['qty'], [
                    'harga_beli' => (float) $it['harga_beli'],
                ]);

                $stokAkhir = DB::table('obat')->where('id', $it['obat_id'])->value('stok');

                DB::table('stok_mutasi')->insert([
                    'obat_id' => $it['obat_id'],
                    'tanggal' => now(),
                    'jenis' => 'masuk',
                    'qty' => (int) $it['qty'],
                    'stok_akhir' => (int) $stokAkhir,
                    'ref_tabel' => 'pembelian',
                    'ref_id' => $pembelianId,
                    'keterangan' => 'Pembelian ' . $noBeli,
                    'user_id' => $userId,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Pembelian {$noBeli} berhasil disimpan & stok obat telah diperbarui.",
                'data' => [
                    'id' => $pembelianId,
                    'no_beli' => $noBeli,
                    'total' => $total,
                ],
            ]);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan pembelian: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Data penyesuaian/stok opname (daftar obat aktif & riwayat opname)
     */
    public function penyesuaianIndex(): JsonResponse
    {
        $obat = DB::table('obat')
            ->where('status', 'aktif')
            ->select('id', 'kode', 'nama', 'stok')
            ->orderBy('nama')
            ->get();

        $riwayat = DB::table('stok_mutasi as m')
            ->join('obat as o', 'o.id', '=', 'm.obat_id')
            ->leftJoin('users as u', 'u.id', '=', 'm.user_id')
            ->select(
                'm.id',
                'm.tanggal',
                'o.nama as obat',
                'm.qty',
                'm.stok_akhir',
                'm.keterangan',
                'u.nama as petugas'
            )
            ->where('m.jenis', 'opname')
            ->orderBy('m.id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'obat' => $obat,
            'riwayat' => $riwayat,
        ]);
    }

    /**
     * Simpan penyesuaian / stok opname
     */
    public function penyesuaianStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'obat_id' => ['required', 'integer', 'exists:obat,id'],
            'stok_fisik' => ['required', 'integer', 'min:0'],
            'keterangan' => ['nullable', 'string', 'max:255'],
        ]);

        $obat = DB::table('obat')->where('id', $validated['obat_id'])->first();
        if (! $obat) {
            return response()->json(['success' => false, 'message' => 'Obat tidak ditemukan.'], 404);
        }

        $sistem = (int) $obat->stok;
        $fisik = (int) $validated['stok_fisik'];
        $selisih = $fisik - $sistem;
        $ket = ! empty($validated['keterangan']) ? trim($validated['keterangan']) : 'Stok opname';
        $userId = $request->user()?->id;

        try {
            DB::beginTransaction();

            DB::table('obat')->where('id', $validated['obat_id'])->update([
                'stok' => $fisik,
            ]);

            DB::table('stok_mutasi')->insert([
                'obat_id' => $validated['obat_id'],
                'tanggal' => now(),
                'jenis' => 'opname',
                'qty' => $selisih,
                'stok_akhir' => $fisik,
                'ref_tabel' => 'opname',
                'keterangan' => $ket,
                'user_id' => $userId,
            ]);

            DB::commit();

            $diffStr = ($selisih >= 0 ? '+' : '') . $selisih;

            return response()->json([
                'success' => true,
                'message' => "Penyesuaian stok berhasil disimpan (selisih: {$diffStr}).",
                'data' => [
                    'obat_id' => $validated['obat_id'],
                    'stok_sistem' => $sistem,
                    'stok_fisik' => $fisik,
                    'selisih' => $selisih,
                ],
            ]);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan penyesuaian stok: ' . $e->getMessage(),
            ], 500);
        }
    }
}

