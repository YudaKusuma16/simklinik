<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class BillingController extends Controller
{
    /**
     * Daftar tagihan kunjungan pasien (status billing, pembayaran, selesai)
     */
    public function index(Request $request): JsonResponse
    {
        $tgl = $request->query('tgl', date('Y-m-d'));
        $search = trim($request->query('q', ''));

        $query = DB::table('kunjungan as k')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('billing as b', 'b.kunjungan_id', '=', 'k.id')
            ->leftJoin('invoice as inv', 'inv.kunjungan_id', '=', 'k.id')
            ->select(
                'k.id',
                'k.no_kunjungan',
                'k.no_antrian',
                'k.status',
                'k.status as kunjungan_status',
                'k.tgl_kunjungan',
                'k.jenis_registrasi',
                'k.jenis_penjamin',
                'p.no_mr',
                'p.nama as pasien',
                'p.nama as pasien_nama',
                'p.telepon as pasien_telepon',
                'po.kode as poli_kode',
                'po.nama as poli',
                'po.nama as poli_nama',
                'b.id as billing_id',
                'b.subtotal as billing_subtotal',
                'b.diskon as billing_diskon',
                'b.total as billing_total',
                'b.cover_penjamin as billing_cover_penjamin',
                'b.status as billing_status',
                'inv.id as invoice_id',
                'inv.no_invoice',
                'inv.total as invoice_total',
                'inv.terbayar as invoice_terbayar',
                'inv.status as invoice_status'
            )
            ->whereIn('k.status', ['billing', 'pembayaran', 'selesai']);

        if (! empty($tgl)) {
            $query->where('k.tgl_kunjungan', $tgl);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('p.nama', 'LIKE', "%{$search}%")
                  ->orWhere('p.no_mr', 'LIKE', "%{$search}%")
                  ->orWhere('k.no_kunjungan', 'LIKE', "%{$search}%")
                  ->orWhere('inv.no_invoice', 'LIKE', "%{$search}%");
            });
        }

        $rows = $query->orderBy('k.id', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $rows,
            'total' => $rows->count(),
            'tgl' => $tgl,
        ]);
    }

    /**
     * Mengumpulkan rincian seluruh item tagihan layanan (konsultasi, tindakan, lab, obat)
     */
    private function collectBillingLines(int $kunjunganId): array
    {
        $lines = [];

        // 1. Tindakan medis & Konsultasi
        $tindakanRows = DB::table('rm_tindakan as rt')
            ->join('rekam_medis as rm', 'rm.id', '=', 'rt.rekam_medis_id')
            ->join('kunjungan as kj', 'kj.id', '=', 'rm.kunjungan_id')
            ->leftJoin('tindakan as t', 't.id', '=', 'rt.tindakan_id')
            ->leftJoin('konsultasi as k', 'k.id', '=', 'rt.konsultasi_id')
            ->select(
                DB::raw('COALESCE(rt.tgl_layanan, kj.tgl_kunjungan) as tgl_layanan'),
                DB::raw("COALESCE(t.kode, k.kode, 'TIND') as kode"),
                'rt.nama_tindakan',
                'rt.qty',
                'rt.tarif',
                'rt.subtotal',
                'rt.konsultasi_id'
            )
            ->where('rm.kunjungan_id', $kunjunganId)
            ->get();

        foreach ($tindakanRows as $r) {
            $kat = ! empty($r->konsultasi_id) ? 'konsultasi' : 'tindakan';
            $lines[] = [
                'tgl_layanan' => $r->tgl_layanan,
                'kategori' => $kat,
                'item_code' => $r->kode,
                'deskripsi' => $r->nama_tindakan,
                'qty' => (int) $r->qty,
                'tarif' => (float) $r->tarif,
                'subtotal' => (float) $r->subtotal,
            ];
        }

        // 2. Resep Obat / Farmasi
        $obatRows = DB::table('resep_detail as rd')
            ->join('resep as r', 'r.id', '=', 'rd.resep_id')
            ->join('kunjungan as kj', 'kj.id', '=', 'r.kunjungan_id')
            ->join('obat as o', 'o.id', '=', 'rd.obat_id')
            ->select(
                DB::raw('COALESCE(rd.tgl_layanan, kj.tgl_kunjungan) as tgl_layanan'),
                'o.kode',
                'o.nama as obat_nama',
                'rd.qty',
                'rd.harga as tarif',
                'rd.subtotal'
            )
            ->where('r.kunjungan_id', $kunjunganId)
            ->get();

        foreach ($obatRows as $o) {
            $lines[] = [
                'tgl_layanan' => $o->tgl_layanan,
                'kategori' => 'farmasi',
                'item_code' => $o->kode,
                'deskripsi' => $o->obat_nama,
                'qty' => (int) $o->qty,
                'tarif' => (float) $o->tarif,
                'subtotal' => (float) $o->subtotal,
            ];
        }

        return $lines;
    }

    /**
     * Memuat lembar proses kasir / kalkulasi billing satu kunjungan
     */
    public function showProses(int $kunjunganId): JsonResponse
    {
        $kj = DB::table('kunjungan as k')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->leftJoin('asuransi as a', 'a.id', '=', 'k.asuransi_id')
            ->leftJoin('corporate as c', 'c.id', '=', 'k.corporate_id')
            ->select(
                'k.*',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.nik as pasien_nik',
                'po.kode as poli_kode',
                'po.nama as poli_nama',
                'd.nama as dokter_nama',
                'a.nama as asuransi_nama',
                'c.nama as corporate_nama'
            )
            ->where('k.id', $kunjunganId)
            ->first();

        if (! $kj) {
            return response()->json(['success' => false, 'message' => 'Kunjungan tidak ditemukan.'], 404);
        }

        $billing = DB::table('billing')->where('kunjungan_id', $kunjunganId)->first();
        $isFinal = $billing && $billing->status === 'final';

        $lines = [];
        if ($isFinal) {
            $savedLines = DB::table('billing_detail')->where('billing_id', $billing->id)->orderBy('id')->get();
            foreach ($savedLines as $sl) {
                $lines[] = [
                    'tgl_layanan' => $sl->tgl_layanan,
                    'kategori' => $sl->kategori,
                    'item_code' => $sl->item_code,
                    'deskripsi' => $sl->deskripsi,
                    'qty' => (int) $sl->qty,
                    'tarif' => (float) $sl->tarif,
                    'subtotal' => (float) $sl->subtotal,
                ];
            }
        } else {
            $lines = $this->collectBillingLines($kunjunganId);

            // Default administrasi jika belum ada
            $admTersimpan = $billing ? (float) DB::table('billing_detail')
                ->where('billing_id', $billing->id)
                ->where('kategori', 'administrasi')
                ->value('subtotal') : 0;

            if ($admTersimpan > 0) {
                $lines[] = [
                    'tgl_layanan' => $kj->tgl_kunjungan,
                    'kategori' => 'administrasi',
                    'item_code' => 'GBKAD0001',
                    'deskripsi' => 'Biaya Administrasi & Registrasi',
                    'qty' => 1,
                    'tarif' => $admTersimpan,
                    'subtotal' => $admTersimpan,
                ];
            } else {
                $biayaAdmin = ($kj->jenis_registrasi === 'rawat_inap') ? 25000 : 10000;
                $lines[] = [
                    'tgl_layanan' => $kj->tgl_kunjungan,
                    'kategori' => 'administrasi',
                    'item_code' => 'GBKAD0001',
                    'deskripsi' => 'Biaya Administrasi & Registrasi',
                    'qty' => 1,
                    'tarif' => (float) $biayaAdmin,
                    'subtotal' => (float) $biayaAdmin,
                ];
            }
        }

        $subtotal = array_sum(array_column($lines, 'subtotal'));
        $diskon = (float) ($billing?->diskon ?? 0);
        $total = max(0, $subtotal - $diskon);

        $banks = DB::table('bank')->where('status', 'aktif')->orderBy('nama_bank')->get();
        $invoice = DB::table('invoice')->where('kunjungan_id', $kunjunganId)->first();

        $pembayaran = [];
        if ($invoice) {
            $pembayaran = DB::table('pembayaran as pm')
                ->leftJoin('bank as b', 'b.id', '=', 'pm.bank_id')
                ->leftJoin('users as u', 'u.id', '=', 'pm.user_id')
                ->select('pm.*', 'b.nama_bank', 'u.nama as kasir_nama')
                ->where('pm.invoice_id', $invoice->id)
                ->orderBy('pm.id')
                ->get();
        }

        return response()->json([
            'success' => true,
            'kunjungan' => $kj,
            'billing' => $billing,
            'lines' => $lines,
            'subtotal' => $subtotal,
            'diskon' => $diskon,
            'total' => $total,
            'cover_penjamin' => (float) ($billing?->cover_penjamin ?? 0),
            'banks' => $banks,
            'invoice' => $invoice,
            'pembayaran' => $pembayaran,
        ]);
    }

    /**
     * Menyimpan billing (draf atau finalisasi menjadi invoice)
     */
    public function simpanBilling(Request $request, int $kunjunganId): JsonResponse
    {
        $kj = DB::table('kunjungan')->where('id', $kunjunganId)->first();
        if (! $kj) {
            return response()->json(['success' => false, 'message' => 'Kunjungan tidak ditemukan.'], 404);
        }

        $validated = $request->validate([
            'aksi' => ['required', 'in:simpan,finalisasi'],
            'diskon' => ['nullable', 'numeric', 'min:0'],
            'cover_penjamin' => ['nullable', 'numeric', 'min:0'],
            'administrasi' => ['nullable', 'numeric', 'min:0'],
            'jenis_penjamin' => ['nullable', 'in:umum,bpjs,asuransi,corporate,ar'],
            'asuransi_id' => ['nullable', 'integer', 'exists:asuransi,id'],
            'corporate_id' => ['nullable', 'integer', 'exists:corporate,id'],
            'no_jaminan' => ['nullable', 'string', 'max:50'],
        ]);

        $svcLines = $this->collectBillingLines($kunjunganId);
        $biayaAdmin = (float) ($validated['administrasi'] ?? 10000);
        $diskon = (float) ($validated['diskon'] ?? 0);

        $svcSubtotal = array_sum(array_column($svcLines, 'subtotal'));
        $subtotal = $svcSubtotal + $biayaAdmin;
        $total = max(0, $subtotal - $diskon);

        // Pembulatan ke kelipatan 500
        if ($total > 0) {
            $total = (float) (ceil($total / 500) * 500);
        }

        $coverPenjamin = (float) ($validated['cover_penjamin'] ?? 0);
        $statusBilling = ($validated['aksi'] === 'finalisasi') ? 'final' : 'draft';

        try {
            DB::beginTransaction();

            // Update penjamin di kunjungan
            DB::table('kunjungan')->where('id', $kunjunganId)->update([
                'jenis_penjamin' => $validated['jenis_penjamin'] ?? $kj->jenis_penjamin,
                'asuransi_id' => $validated['asuransi_id'] ?? $kj->asuransi_id,
                'corporate_id' => $validated['corporate_id'] ?? $kj->corporate_id,
                'no_jaminan' => $validated['no_jaminan'] ?? $kj->no_jaminan,
            ]);

            // Upsert Billing
            $existingBilling = DB::table('billing')->where('kunjungan_id', $kunjunganId)->first();
            if ($existingBilling) {
                DB::table('billing')->where('id', $existingBilling->id)->update([
                    'subtotal' => $subtotal,
                    'diskon' => $diskon,
                    'total' => $total,
                    'cover_penjamin' => $coverPenjamin,
                    'status' => $statusBilling,
                ]);
                $billingId = $existingBilling->id;
            } else {
                $billingId = DB::table('billing')->insertGetId([
                    'kunjungan_id' => $kunjunganId,
                    'subtotal' => $subtotal,
                    'diskon' => $diskon,
                    'total' => $total,
                    'cover_penjamin' => $coverPenjamin,
                    'status' => $statusBilling,
                    'created_at' => now(),
                ]);
            }

            // Rebuild detail
            DB::table('billing_detail')->where('billing_id', $billingId)->delete();
            foreach ($svcLines as $l) {
                DB::table('billing_detail')->insert([
                    'billing_id' => $billingId,
                    'tgl_layanan' => $l['tgl_layanan'],
                    'kategori' => $l['kategori'],
                    'item_code' => $l['item_code'],
                    'deskripsi' => $l['deskripsi'],
                    'qty' => $l['qty'],
                    'tarif' => $l['tarif'],
                    'subtotal' => $l['subtotal'],
                ]);
            }

            if ($biayaAdmin > 0) {
                DB::table('billing_detail')->insert([
                    'billing_id' => $billingId,
                    'tgl_layanan' => $kj->tgl_kunjungan,
                    'kategori' => 'administrasi',
                    'item_code' => 'GBKAD0001',
                    'deskripsi' => 'Biaya Administrasi & Registrasi',
                    'qty' => 1,
                    'tarif' => $biayaAdmin,
                    'subtotal' => $biayaAdmin,
                ]);
            }

            // Jika finalisasi, buat invoice resmi dan majukan status kunjungan ke 'pembayaran'
            $invoiceId = null;
            if ($validated['aksi'] === 'finalisasi') {
                DB::table('kunjungan')->where('id', $kunjunganId)->update([
                    'status' => 'pembayaran',
                ]);

                $existingInvoice = DB::table('invoice')->where('kunjungan_id', $kunjunganId)->first();
                if (! $existingInvoice) {
                    $tglStr = date('Ymd');
                    $prefixLike = 'INV-' . $tglStr . '-%';
                    $countInv = DB::table('invoice')->where('no_invoice', 'LIKE', $prefixLike)->count() + 1;
                    $noInvoice = sprintf('INV-%s-%04d', $tglStr, $countInv);

                    $invoiceId = DB::table('invoice')->insertGetId([
                        'no_invoice' => $noInvoice,
                        'billing_id' => $billingId,
                        'kunjungan_id' => $kunjunganId,
                        'tanggal' => now(),
                        'total' => $total,
                        'terbayar' => 0,
                        'status' => 'belum_bayar',
                        'created_at' => now(),
                    ]);
                } else {
                    DB::table('invoice')->where('id', $existingInvoice->id)->update([
                        'total' => $total,
                    ]);
                    $invoiceId = $existingInvoice->id;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => ($validated['aksi'] === 'finalisasi')
                    ? 'Billing berhasil difinalisasi. Invoice tagihan telah diterbitkan.'
                    : 'Draf billing berhasil disimpan.',
                'billing_id' => $billingId,
                'invoice_id' => $invoiceId,
                'total' => $total,
            ]);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses billing: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Memproses pencatatan transaksi pembayaran di kasir
     */
    public function bayar(Request $request, int $kunjunganId): JsonResponse
    {
        $invoice = DB::table('invoice')->where('kunjungan_id', $kunjunganId)->first();
        if (! $invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice tagihan belum diterbitkan.'], 422);
        }

        if ($invoice->status === 'lunas') {
            return response()->json(['success' => false, 'message' => 'Tagihan invoice ini sudah lunas.'], 422);
        }

        $sisa = (float) $invoice->total - (float) $invoice->terbayar;

        $validated = $request->validate([
            'metode' => ['required', 'in:cash,transfer,qris,edc,va,ewallet,penjamin'],
            'jumlah' => ['required', 'numeric', 'min:1'],
            'bank_id' => ['nullable', 'integer', 'exists:bank,id'],
            'keterangan' => ['nullable', 'string', 'max:200'],
        ]);

        $jumlahBayar = (float) $validated['jumlah'];
        if ($jumlahBayar > ($sisa + 1)) {
            return response()->json([
                'success' => false,
                'message' => 'Jumlah bayar melebihi sisa tagihan (Sisa: Rp ' . number_format($sisa, 0, ',', '.') . ').',
            ], 422);
        }

        $userId = $request->user()?->id;

        try {
            DB::beginTransaction();

            // 1. Catat pembayaran
            DB::table('pembayaran')->insert([
                'invoice_id' => $invoice->id,
                'tanggal' => now(),
                'metode' => $validated['metode'],
                'bank_id' => $validated['bank_id'] ?? null,
                'jumlah' => $jumlahBayar,
                'status' => 'valid',
                'keterangan' => $validated['keterangan'] ?? null,
                'user_id' => $userId,
            ]);

            // 2. Update invoice terbayar & status
            $newTerbayar = (float) $invoice->terbayar + $jumlahBayar;
            $newStatusInv = ($newTerbayar >= ($invoice->total - 1)) ? 'lunas' : 'sebagian';

            DB::table('invoice')->where('id', $invoice->id)->update([
                'terbayar' => $newTerbayar,
                'status' => $newStatusInv,
            ]);

            // 3. Jika lunas, update kunjungan ke 'selesai'
            if ($newStatusInv === 'lunas') {
                DB::table('kunjungan')->where('id', $kunjunganId)->update([
                    'status' => 'selesai',
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => ($newStatusInv === 'lunas')
                    ? 'Pembayaran berhasil. Tagihan telah LUNAS dan pelayanan selesai.'
                    : 'Pembayaran sebagian berhasil dicatat.',
                'invoice_status' => $newStatusInv,
                'terbayar' => $newTerbayar,
                'sisa' => max(0, (float) $invoice->total - $newTerbayar),
            ]);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses pembayaran: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Memuat berkas cetak Invoice & Kwitansi resmi
     */
    public function showInvoice(int $kunjunganId): JsonResponse
    {
        $invoice = DB::table('invoice as inv')
            ->join('kunjungan as k', 'k.id', '=', 'inv.kunjungan_id')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->select(
                'inv.*',
                'k.no_kunjungan',
                'k.tgl_kunjungan',
                'k.jenis_penjamin',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.alamat as pasien_alamat',
                'po.nama as poli_nama',
                'd.nama as dokter_nama'
            )
            ->where('inv.kunjungan_id', $kunjunganId)
            ->first();

        if (! $invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice tidak ditemukan.'], 404);
        }

        $billing = DB::table('billing')->where('kunjungan_id', $kunjunganId)->first();
        $items = $billing ? DB::table('billing_detail')->where('billing_id', $billing->id)->get() : [];

        $pembayaran = DB::table('pembayaran as pm')
            ->leftJoin('bank as b', 'b.id', '=', 'pm.bank_id')
            ->select('pm.*', 'b.nama_bank')
            ->where('pm.invoice_id', $invoice->id)
            ->orderBy('pm.id')
            ->get();

        return response()->json([
            'success' => true,
            'invoice' => $invoice,
            'billing' => $billing,
            'items' => $items,
            'pembayaran' => $pembayaran,
        ]);
    }
}
