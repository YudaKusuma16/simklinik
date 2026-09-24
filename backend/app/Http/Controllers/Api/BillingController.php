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
        $tab = $request->query('tab', 'billing');
        $tgl = $request->query('tgl', date('Y-m-d'));
        $search = trim($request->query('q', ''));

        if ($tab === 'keuangan') {
            $query = DB::table('kunjungan as k')
                ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
                ->join('poli as po', 'po.id', '=', 'k.poli_id')
                ->join('billing as b', function ($join) {
                    $join->on('b.kunjungan_id', '=', 'k.id')->where('b.status', '=', 'final');
                })
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
                    'po.kode as poli_kode',
                    'po.nama as poli',
                    'b.id as billing_id',
                    'b.total as billing_total',
                    'b.cover_penjamin as billing_cover_penjamin',
                    'inv.id as invoice_id',
                    'inv.no_invoice',
                    'inv.total as invoice_total',
                    'inv.terbayar as invoice_terbayar',
                    'inv.status as invoice_status'
                )
                ->where('k.tgl_kunjungan', $tgl)
                ->whereIn('k.status', ['pembayaran', 'selesai']);

            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('p.nama', 'LIKE', "%{$search}%")
                      ->orWhere('p.no_mr', 'LIKE', "%{$search}%")
                      ->orWhere('k.no_kunjungan', 'LIKE', "%{$search}%")
                      ->orWhere('inv.no_invoice', 'LIKE', "%{$search}%");
                });
            }

            $rows = $query->orderBy('k.id', 'desc')->get();

            $totalTagihan = 0;
            $totalBayar = 0;
            $piutang = 0;

            foreach ($rows as $r) {
                $tagihan = (float) ($r->invoice_total ?? $r->billing_total ?? 0);
                $terbayar = (float) ($r->invoice_terbayar ?? 0);

                if ($r->jenis_penjamin !== 'umum') {
                    $cover = (float) ($r->billing_cover_penjamin ?? 0);
                    if ($cover <= 0 && ($r->invoice_status ?? '') !== 'lunas') {
                        $cover = $tagihan;
                    }
                    $tanggunganPasien = max(0, $tagihan - $cover);

                    $hasPenjPmt = false;
                    if (! empty($r->invoice_id)) {
                        $hasPenjPmt = DB::table('pembayaran')
                            ->where('invoice_id', $r->invoice_id)
                            ->where('metode', 'penjamin')
                            ->where('status', 'valid')
                            ->exists();
                    }

                    $sisaPasien = $hasPenjPmt ? max(0, $tagihan - $terbayar) : max(0, $tanggunganPasien - $terbayar);
                } else {
                    $sisaPasien = max(0, $tagihan - $terbayar);
                }

                $r->sisa_pasien = $sisaPasien;
                $totalTagihan += $tagihan;
                $totalBayar += $terbayar;
                $piutang += $sisaPasien;
            }

            return response()->json([
                'success' => true,
                'data' => $rows,
                'total' => $rows->count(),
                'tgl' => $tgl,
                'summary' => [
                    'total_tagihan' => $totalTagihan,
                    'total_bayar' => $totalBayar,
                    'piutang' => $piutang,
                ],
            ]);
        }

        // Tab Billing (matching modules/billing/index.php)
        $query = DB::table('kunjungan as k')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('billing as b', 'b.kunjungan_id', '=', 'k.id')
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
                'po.kode as poli_kode',
                'po.nama as poli',
                'b.id as billing_id',
                'b.total as billing_total',
                'b.status as billing_status'
            )
            ->where('k.tgl_kunjungan', $tgl)
            ->whereIn('k.status', ['billing', 'pembayaran', 'selesai']);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('p.nama', 'LIKE', "%{$search}%")
                  ->orWhere('p.no_mr', 'LIKE', "%{$search}%")
                  ->orWhere('k.no_kunjungan', 'LIKE', "%{$search}%");
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
     * Mengumpulkan rincian seluruh item tagihan layanan (konsultasi, tindakan, lab, radiologi, diagnostik, fisio, obat)
     * Mengikuti kalkulasi persis di simrs-backup/legacy/includes/billing_lib.php
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
                DB::raw("COALESCE(t.kode, k.kode, '') as kode"),
                'rt.nama_tindakan',
                'rt.qty',
                'rt.tarif as rt_tarif',
                DB::raw('COALESCE(t.tarif, k.tarif, 0) as base_tarif'),
                DB::raw('COALESCE(t.harga_jual, k.harga_jual, 0) as harga_jual'),
                'rt.tindakan_id',
                'rt.konsultasi_id'
            )
            ->where('rm.kunjungan_id', $kunjunganId)
            ->get();

        foreach ($tindakanRows as $r) {
            $rtT = (float) ($r->rt_tarif ?? 0);
            $hj = (float) ($r->harga_jual ?? 0);
            $base = (float) ($r->base_tarif ?? 0);
            $calcTarif = $rtT > 0 ? $rtT : ($hj > 0 ? $hj : round($base * 1.40, 2));
            $qty = (int) $r->qty;
            $kat = ! empty($r->konsultasi_id) ? 'konsultasi' : 'tindakan';
            $lines[] = [
                'tgl_layanan' => $r->tgl_layanan,
                'kategori' => $kat,
                'item_code' => $r->kode ?? '',
                'deskripsi' => $r->nama_tindakan,
                'qty' => $qty,
                'tarif' => $calcTarif,
                'subtotal' => $calcTarif * $qty,
            ];
        }

        // 2. Laboratorium
        $labRows = DB::table('lab_order_detail as lod')
            ->join('lab_order as lo', 'lo.id', '=', 'lod.lab_order_id')
            ->join('kunjungan as kj', 'kj.id', '=', 'lo.kunjungan_id')
            ->join('lab_pemeriksaan as lp', 'lp.id', '=', 'lod.pemeriksaan_id')
            ->select(
                DB::raw('COALESCE(lod.tgl_layanan, kj.tgl_kunjungan) as tgl_layanan'),
                'lp.kode',
                'lp.nama as lab_nama',
                'lod.qty',
                'lod.hasil',
                'lod.tarif as lod_tarif',
                'lp.tarif as base_tarif',
                'lp.harga_jual'
            )
            ->where('lo.kunjungan_id', $kunjunganId)
            ->get();

        foreach ($labRows as $l) {
            $lodT = (float) ($l->lod_tarif ?? 0);
            $hj = (float) ($l->harga_jual ?? 0);
            $base = (float) ($l->base_tarif ?? 0);
            $calcTarif = $lodT > 0 ? $lodT : ($hj > 0 ? $hj : round($base * 1.40, 2));
            $qty = (int) $l->qty;
            $lines[] = [
                'tgl_layanan' => $l->tgl_layanan,
                'kategori' => 'laboratorium',
                'item_code' => $l->kode,
                'deskripsi' => $l->lab_nama,
                'hasil' => $l->hasil ?? null,
                'qty' => $qty,
                'tarif' => $calcTarif,
                'subtotal' => $calcTarif * $qty,
            ];
        }

        // 3. Radiologi
        $radRows = DB::table('rad_order_detail as rod')
            ->join('rad_order as ro', 'ro.id', '=', 'rod.rad_order_id')
            ->join('kunjungan as kj', 'kj.id', '=', 'ro.kunjungan_id')
            ->join('rad_pemeriksaan as rp', 'rp.id', '=', 'rod.pemeriksaan_id')
            ->select(
                DB::raw('COALESCE(rod.tgl_layanan, kj.tgl_kunjungan) as tgl_layanan'),
                'rp.kode',
                'rp.nama as rad_nama',
                'rod.qty',
                'rod.hasil',
                'rod.tarif as rod_tarif',
                'rp.tarif as base_tarif',
                'rp.harga_jual'
            )
            ->where('ro.kunjungan_id', $kunjunganId)
            ->get();

        foreach ($radRows as $rd) {
            $rodT = (float) ($rd->rod_tarif ?? 0);
            $hj = (float) ($rd->harga_jual ?? 0);
            $base = (float) ($rd->base_tarif ?? 0);
            $calcTarif = $rodT > 0 ? $rodT : ($hj > 0 ? $hj : round($base * 1.40, 2));
            $qty = (int) $rd->qty;
            $lines[] = [
                'tgl_layanan' => $rd->tgl_layanan,
                'kategori' => 'radiologi',
                'item_code' => $rd->kode,
                'deskripsi' => $rd->rad_nama,
                'hasil' => $rd->hasil ?? null,
                'qty' => $qty,
                'tarif' => $calcTarif,
                'subtotal' => $calcTarif * $qty,
            ];
        }

        // 4. Diagnostik
        $diagRows = DB::table('diag_order_detail as dod')
            ->join('diag_order as do2', 'do2.id', '=', 'dod.diag_order_id')
            ->join('kunjungan as kj', 'kj.id', '=', 'do2.kunjungan_id')
            ->join('diag_pemeriksaan as dp', 'dp.id', '=', 'dod.pemeriksaan_id')
            ->select(
                DB::raw('COALESCE(dod.tgl_layanan, kj.tgl_kunjungan) as tgl_layanan'),
                'dp.kode',
                'dp.nama as diag_nama',
                'dod.tarif as dod_tarif',
                'dod.qty',
                'dod.hasil',
                'dp.tarif as base_tarif',
                'dp.harga_jual'
            )
            ->where('do2.kunjungan_id', $kunjunganId)
            ->get();

        foreach ($diagRows as $dd) {
            $dodT = (float) ($dd->dod_tarif ?? 0);
            $hj = (float) ($dd->harga_jual ?? 0);
            $base = (float) ($dd->base_tarif ?? 0);
            $calcTarif = $dodT > 0 ? $dodT : ($hj > 0 ? $hj : round($base * 1.40, 2));
            $qty = (int) $dd->qty;
            $lines[] = [
                'tgl_layanan' => $dd->tgl_layanan,
                'kategori' => 'diagnostik',
                'item_code' => $dd->kode,
                'deskripsi' => $dd->diag_nama,
                'hasil' => $dd->hasil ?? null,
                'qty' => $qty,
                'tarif' => $calcTarif,
                'subtotal' => $calcTarif * $qty,
            ];
        }

        // 5. Fisioterapi
        $fisioRows = DB::table('fisio_order_detail as fod')
            ->join('fisio_order as fo', 'fo.id', '=', 'fod.fisio_order_id')
            ->join('kunjungan as kj', 'kj.id', '=', 'fo.kunjungan_id')
            ->join('fisio_pemeriksaan as fp', 'fp.id', '=', 'fod.pemeriksaan_id')
            ->select(
                DB::raw('COALESCE(fod.tgl_layanan, kj.tgl_kunjungan) as tgl_layanan'),
                'fp.kode',
                'fp.nama as fisio_nama',
                'fod.tarif as fod_tarif',
                'fod.qty',
                'fod.hasil',
                'fp.tarif as base_tarif',
                'fp.harga_jual'
            )
            ->where('fo.kunjungan_id', $kunjunganId)
            ->get();

        foreach ($fisioRows as $fd) {
            $fodT = (float) ($fd->fod_tarif ?? 0);
            $hj = (float) ($fd->harga_jual ?? 0);
            $base = (float) ($fd->base_tarif ?? 0);
            $calcTarif = $fodT > 0 ? $fodT : ($hj > 0 ? $hj : round($base * 1.40, 2));
            $qty = (int) $fd->qty;
            $lines[] = [
                'tgl_layanan' => $fd->tgl_layanan,
                'kategori' => 'fisioterapi',
                'item_code' => $fd->kode,
                'deskripsi' => $fd->fisio_nama,
                'hasil' => $fd->hasil ?? null,
                'qty' => $qty,
                'tarif' => $calcTarif,
                'subtotal' => $calcTarif * $qty,
            ];
        }

        // 6. Resep Obat / Farmasi
        $obatRows = DB::table('resep_detail as rd')
            ->join('resep as r', 'r.id', '=', 'rd.resep_id')
            ->join('kunjungan as kj', 'kj.id', '=', 'r.kunjungan_id')
            ->join('obat as o', 'o.id', '=', 'rd.obat_id')
            ->select(
                DB::raw('COALESCE(rd.tgl_layanan, kj.tgl_kunjungan) as tgl_layanan'),
                'o.kode',
                'o.nama as obat_nama',
                'rd.qty',
                'rd.harga as rd_harga',
                'o.harga_beli',
                'o.harga_jual'
            )
            ->where('r.kunjungan_id', $kunjunganId)
            ->get();

        foreach ($obatRows as $o) {
            $rdH = (float) ($o->rd_harga ?? 0);
            $hj = (float) ($o->harga_jual ?? 0);
            $base = (float) ($o->harga_beli ?? 0);
            $calcTarif = $rdH > 0 ? $rdH : ($hj > 0 ? $hj : round($base * 1.40, 2));
            $qty = (int) $o->qty;
            $lines[] = [
                'tgl_layanan' => $o->tgl_layanan,
                'kategori' => 'farmasi',
                'item_code' => $o->kode,
                'deskripsi' => $o->obat_nama,
                'qty' => $qty,
                'tarif' => $calcTarif,
                'subtotal' => $calcTarif * $qty,
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

        if ($isFinal) {
            $savedLines = DB::table('billing_detail')->where('billing_id', $billing->id)->orderBy('id')->get();
            $lines = [];
            $savedAdm = 0;
            foreach ($savedLines as $sl) {
                if ($sl->kategori === 'administrasi') {
                    $savedAdm = (float) $sl->subtotal;
                    continue;
                }
                $lines[] = [
                    'tgl_layanan' => $sl->tgl_layanan,
                    'kategori' => $sl->kategori,
                    'item_code' => $sl->item_code,
                    'deskripsi' => $sl->deskripsi,
                    'hasil' => $sl->hasil ?? null,
                    'qty' => (int) $sl->qty,
                    'tarif' => (float) $sl->tarif,
                    'subtotal' => (float) $sl->subtotal,
                ];
            }
            $svcOnly = array_sum(array_column($lines, 'subtotal'));
            $administrasi = $savedAdm;
            $subtotal = (float) $billing->subtotal;
            $diskon = (float) $billing->diskon;
            $total = (float) $billing->total;
        } else {
            $lines = $this->collectBillingLines($kunjunganId);
            $svcOnly = array_sum(array_column($lines, 'subtotal'));

            $admTersimpan = $billing ? DB::table('billing_detail')
                ->where('billing_id', $billing->id)
                ->where('kategori', 'administrasi')
                ->value('subtotal') : null;

            $administrasi = ($admTersimpan !== null) ? (float) $admTersimpan : 0;

            $subtotal = $svcOnly + $administrasi;
            $diskon = (float) ($billing?->diskon ?? 0);
            $totalRaw = max(0, $subtotal - $diskon);
            $total = ($totalRaw > 0) ? (float) (ceil($totalRaw / 500) * 500) : 0;
        }

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

        $payload = [
            'success' => true,
            'kunjungan' => $kj,
            'billing' => $billing,
            'lines' => $lines,
            'rincian' => $lines,
            'svc_subtotal' => $svcOnly,
            'administrasi' => $administrasi,
            'subtotal' => $subtotal,
            'diskon' => $diskon,
            'total' => $total,
            'cover_penjamin' => (float) ($billing?->cover_penjamin ?? 0),
            'banks' => $banks,
            'invoice' => $invoice,
            'pembayaran' => $pembayaran,
        ];
        $payload['data'] = $payload;

        return response()->json($payload);
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
            'hasil_diagnostik' => ['nullable', 'string'],
        ]);

        $rawAdmin = max(0, (float) ($validated['administrasi'] ?? 0));
        $svcLines = $this->collectBillingLines($kunjunganId);
        $svcSubtotal = array_sum(array_column($svcLines, 'subtotal'));

        $biayaAdmin = $rawAdmin;

        $diskon = max(0, (float) ($validated['diskon'] ?? 0));
        $subtotal = $svcSubtotal + $biayaAdmin;
        $totalRaw = max(0, $subtotal - $diskon);
        $total = ($totalRaw > 0) ? (float) (ceil($totalRaw / 500) * 500) : 0;

        $coverPenjamin = (float) ($validated['cover_penjamin'] ?? 0);
        $statusBilling = ($validated['aksi'] === 'finalisasi') ? 'final' : 'draft';
        $adminDeskripsi = ($kj->jenis_registrasi === 'rawat_inap') ? 'Biaya Administrasi Rawat Inap' : 'Biaya Administrasi & Registrasi';

        try {
            DB::beginTransaction();

            // Update penjamin di kunjungan
            $jenisPenjamin = $validated['jenis_penjamin'] ?? $kj->jenis_penjamin;
            DB::table('kunjungan')->where('id', $kunjunganId)->update([
                'jenis_penjamin' => $jenisPenjamin,
                'asuransi_id' => $jenisPenjamin === 'asuransi' ? ($validated['asuransi_id'] ?? $kj->asuransi_id) : null,
                'corporate_id' => $jenisPenjamin === 'corporate' ? ($validated['corporate_id'] ?? $kj->corporate_id) : null,
                'no_jaminan' => in_array($jenisPenjamin, ['asuransi', 'corporate'], true) ? ($validated['no_jaminan'] ?? $kj->no_jaminan) : null,
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
                    'hasil_diagnostik' => $validated['hasil_diagnostik'] ?? $existingBilling->hasil_diagnostik,
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
                    'hasil_diagnostik' => $validated['hasil_diagnostik'] ?? null,
                    'created_at' => now(),
                ]);
            }

            // Rebuild detail
            DB::table('billing_detail')->where('billing_id', $billingId)->delete();
            foreach ($svcLines as $l) {
                DB::table('billing_detail')->insert([
                    'billing_id' => $billingId,
                    'tgl_layanan' => $l['tgl_layanan'] ?? $kj->tgl_kunjungan,
                    'kategori' => $l['kategori'],
                    'item_code' => $l['item_code'] ?? '',
                    'deskripsi' => $l['deskripsi'],
                    'hasil' => $l['hasil'] ?? null,
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
                    'deskripsi' => $adminDeskripsi,
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
            $billing = DB::table('billing')->where('kunjungan_id', $kunjunganId)->first();
            if ($billing) {
                $tglStr = date('Ymd');
                $prefixLike = 'INV-' . $tglStr . '-%';
                $countInv = DB::table('invoice')->where('no_invoice', 'LIKE', $prefixLike)->count() + 1;
                $noInvoice = sprintf('INV-%s-%04d', $tglStr, $countInv);
                $invId = DB::table('invoice')->insertGetId([
                    'no_invoice' => $noInvoice,
                    'billing_id' => $billing->id,
                    'kunjungan_id' => $kunjunganId,
                    'tanggal' => now(),
                    'total' => $billing->total,
                    'terbayar' => 0,
                    'status' => 'belum_bayar',
                    'created_at' => now(),
                ]);
                DB::table('billing')->where('id', $billing->id)->update(['status' => 'final']);
                DB::table('kunjungan')->where('id', $kunjunganId)->update(['status' => 'pembayaran']);
                $invoice = DB::table('invoice')->where('id', $invId)->first();
            } else {
                return response()->json(['success' => false, 'message' => 'Tagihan billing belum dibuat untuk kunjungan ini.'], 422);
            }
        }

        if ($invoice->status === 'lunas') {
            return response()->json(['success' => false, 'message' => 'Tagihan invoice ini sudah lunas.'], 422);
        }

        $sisa = (float) $invoice->total - (float) $invoice->terbayar;

        if (! $request->has('metode') && $request->has('metode_pembayaran')) {
            $request->merge(['metode' => $request->input('metode_pembayaran')]);
        }
        if (! $request->has('jumlah') && $request->has('jumlah_bayar')) {
            $request->merge(['jumlah' => $request->input('jumlah_bayar')]);
        } elseif (! $request->has('jumlah') && $request->has('nominal')) {
            $request->merge(['jumlah' => $request->input('nominal')]);
        }

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
            ->leftJoin('asuransi as a', 'a.id', '=', 'k.asuransi_id')
            ->leftJoin('corporate as c', 'c.id', '=', 'k.corporate_id')
            ->select(
                'inv.*',
                'k.no_kunjungan',
                'k.tgl_kunjungan',
                'k.jenis_penjamin',
                'k.no_jaminan',
                'k.jenis_registrasi',
                'k.created_at as admission',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.alamat as pasien_alamat',
                'po.nama as poli_nama',
                'd.nama as dokter_nama',
                'a.nama as asuransi_nama',
                'c.nama as corporate_nama'
            )
            ->where('inv.kunjungan_id', $kunjunganId)
            ->orWhere('inv.id', $kunjunganId)
            ->first();

        if (! $invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice tidak ditemukan.'], 404);
        }

        $billingId = $invoice->billing_id;
        $billing = $billingId
            ? DB::table('billing')->where('id', $billingId)->first()
            : DB::table('billing')->where('kunjungan_id', $invoice->kunjungan_id)->first();

        $items = $billing
            ? DB::table('billing_detail')->where('billing_id', $billing->id)->orderBy('id')->get()
            : [];

        $pembayaran = DB::table('pembayaran as pm')
            ->leftJoin('bank as b', 'b.id', '=', 'pm.bank_id')
            ->select('pm.*', 'b.nama_bank', 'b.no_rekening', 'b.atas_nama')
            ->where('pm.invoice_id', $invoice->id)
            ->orderBy('pm.id')
            ->get();

        $bank = DB::table('bank')->where('status', 'aktif')->orderBy('id')->first();

        $respData = [
            'invoice' => $invoice,
            'billing' => $billing,
            'items' => $items,
            'pembayaran' => $pembayaran,
            'bank' => $bank,
        ];

        return response()->json(array_merge([
            'success' => true,
            'data' => $respData,
        ], $respData));
    }
}
