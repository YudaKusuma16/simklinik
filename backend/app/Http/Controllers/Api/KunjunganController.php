<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class KunjunganController extends Controller
{
    /**
     * Daftar kunjungan pasien dengan filter tanggal, status, poli, dan pencarian
     */
    public function index(Request $request): JsonResponse
    {
        $tgl = $request->query('tgl', date('Y-m-d'));
        $status = $request->query('status');
        $poliId = $request->query('poli_id');
        $search = trim($request->query('q', ''));

        $query = DB::table('kunjungan as k')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->leftJoin('asuransi as a', 'a.id', '=', 'k.asuransi_id')
            ->leftJoin('corporate as c', 'c.id', '=', 'k.corporate_id')
            ->leftJoin('invoice as inv', 'inv.kunjungan_id', '=', 'k.id')
            ->select(
                'k.*',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.nik as pasien_nik',
                'p.telepon as pasien_telepon',
                'p.jenis_kelamin as pasien_jk',
                'po.kode as poli_kode',
                'po.nama as poli_nama',
                'd.nama as dokter_nama',
                'a.nama as asuransi_nama',
                'c.nama as corporate_nama',
                'inv.id as invoice_id',
                'inv.no_invoice'
            );

        if (! empty($tgl)) {
            $query->where('k.tgl_kunjungan', $tgl);
        }

        if (! empty($status)) {
            $query->where('k.status', $status);
        }

        if (! empty($poliId)) {
            $query->where('k.poli_id', $poliId);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('p.nama', 'LIKE', "%{$search}%")
                  ->orWhere('p.no_mr', 'LIKE', "%{$search}%")
                  ->orWhere('k.no_kunjungan', 'LIKE', "%{$search}%")
                  ->orWhere('p.nik', 'LIKE', "%{$search}%");
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
     * Rekap antrean per poli pada tanggal tertentu
     */
    public function antreanRekap(Request $request): JsonResponse
    {
        $tgl = $request->query('tgl', date('Y-m-d'));

        $polis = DB::table('poli')->where('status', 'aktif')->orderBy('nama')->get();
        $rekap = [];

        foreach ($polis as $poli) {
            $counts = DB::table('kunjungan')
                ->where('poli_id', $poli->id)
                ->where('tgl_kunjungan', $tgl)
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'menunggu' THEN 1 ELSE 0 END) as menunggu,
                    SUM(CASE WHEN status = 'periksa' THEN 1 ELSE 0 END) as periksa,
                    SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as selesai,
                    SUM(CASE WHEN status = 'batal' THEN 1 ELSE 0 END) as batal,
                    MAX(CASE WHEN status = 'periksa' THEN no_antrian ELSE 0 END) as antrean_dipanggil,
                    MAX(no_antrian) as antrean_terakhir
                ")
                ->first();

            $rekap[] = [
                'poli_id' => $poli->id,
                'poli_kode' => $poli->kode,
                'poli_nama' => $poli->nama,
                'total' => (int) ($counts->total ?? 0),
                'menunggu' => (int) ($counts->menunggu ?? 0),
                'periksa' => (int) ($counts->periksa ?? 0),
                'selesai' => (int) ($counts->selesai ?? 0),
                'batal' => (int) ($counts->batal ?? 0),
                'antrean_dipanggil' => (int) ($counts->antrean_dipanggil ?? 0),
                'antrean_terakhir' => (int) ($counts->antrean_terakhir ?? 0),
            ];
        }

        return response()->json([
            'success' => true,
            'tgl' => $tgl,
            'data' => $rekap,
        ]);
    }

    /**
     * Master lookups yang dibutuhkan formulir pendaftaran kunjungan
     */
    public function lookups(): JsonResponse
    {
        $poli = DB::table('poli')->where('status', 'aktif')->orderBy('nama')->get(['id', 'kode', 'nama']);
        $dokter = DB::table('dokter as d')
            ->leftJoin('spesialisasi as s', 's.id', '=', 'd.spesialisasi_id')
            ->where('d.status', 'aktif')
            ->orderBy('d.nama')
            ->get(['d.id', 'd.nama', 'd.poli_id', 'd.spesialisasi_id', 's.nama as spesialisasi_nama']);
        $asuransi = DB::table('asuransi')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama']);
        $corporate = DB::table('corporate')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama']);
        $kelompok = DB::table('kelompok_pasien')->orderBy('id')->get(['id', 'nama']);
        $kodeBatal = DB::table('kode_pembatalan')->where('status', 'aktif')->orderBy('kode')->get(['id', 'kode', 'nama', 'keterangan']);

        $tindakan = [];
        $konsultasi = [];
        $lab = [];
        $rad = [];
        $diag = [];
        $fisio = [];
        $obat = [];

        try { $tindakan = DB::table('tindakan')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama', 'tarif', 'harga_jual']); } catch (\Throwable $e) {}
        try { $konsultasi = DB::table('konsultasi')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama', 'tarif', 'harga_jual']); } catch (\Throwable $e) {}
        try { $lab = DB::table('lab_pemeriksaan')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama', 'nilai_rujukan', 'tarif', 'harga_jual']); } catch (\Throwable $e) {}
        try { $rad = DB::table('rad_pemeriksaan')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama', 'tarif', 'harga_jual']); } catch (\Throwable $e) {}
        try { $diag = DB::table('diag_pemeriksaan')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama', 'tarif', 'harga_jual']); } catch (\Throwable $e) {}
        try { $fisio = DB::table('fisio_pemeriksaan')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama', 'tarif', 'harga_jual']); } catch (\Throwable $e) {}
        try { $obat = DB::table('obat')->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama', 'harga_beli', 'harga_jual', 'stok']); } catch (\Throwable $e) {}

        $payload = [
            'success' => true,
            'poli' => $poli,
            'poliklinik' => $poli,
            'dokter' => $dokter,
            'asuransi' => $asuransi,
            'corporate' => $corporate,
            'kelompok_pasien' => $kelompok,
            'kode_pembatalan' => $kodeBatal,
            'tindakan' => $tindakan,
            'konsultasi' => $konsultasi,
            'lab' => $lab,
            'rad' => $rad,
            'diag' => $diag,
            'fisio' => $fisio,
            'obat' => $obat,
        ];
        $payload['data'] = $payload;

        return response()->json($payload);
    }

    /**
     * Detail satu kunjungan
     */
    public function show(int $id): JsonResponse
    {
        $kj = DB::table('kunjungan as k')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->leftJoin('asuransi as a', 'a.id', '=', 'k.asuransi_id')
            ->leftJoin('corporate as c', 'c.id', '=', 'k.corporate_id')
            ->leftJoin('kode_pembatalan as kp', 'kp.id', '=', 'k.kode_pembatalan_id')
            ->select(
                'k.*',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.nik as pasien_nik',
                'p.telepon as pasien_telepon',
                'p.jenis_kelamin as pasien_jk',
                'p.tgl_lahir as pasien_tgl_lahir',
                'po.kode as poli_kode',
                'po.nama as poli_nama',
                'd.nama as dokter_nama',
                'a.nama as asuransi_nama',
                'c.nama as corporate_nama',
                'kp.kode as kode_batal_kode',
                'kp.nama as kode_batal_nama'
            )
            ->where('k.id', $id)
            ->first();

        if (! $kj) {
            return response()->json(['success' => false, 'message' => 'Kunjungan tidak ditemukan.'], 404);
        }

        $pasien = DB::table('pasien')->where('id', $kj->pasien_id)->first();

        // 1. Tindakan & Konsultasi dari rekam_medis -> rm_tindakan
        $rmIds = DB::table('rekam_medis')->where('kunjungan_id', $id)->pluck('id');
        $tindakan = [];
        $konsultasi = [];
        if ($rmIds->isNotEmpty()) {
            $rmRows = DB::table('rm_tindakan')->whereIn('rekam_medis_id', $rmIds)->get();
            foreach ($rmRows as $r) {
                if (!empty($r->tindakan_id)) {
                    $tindakan[] = [
                        'id' => $r->id,
                        'tindakan_id' => $r->tindakan_id,
                        'nama_tindakan' => $r->nama_tindakan,
                        'qty' => (int) $r->qty,
                        'tarif' => (float) $r->tarif,
                        'subtotal' => (float) $r->subtotal,
                        'tgl_layanan' => $r->tgl_layanan ?: $kj->tgl_kunjungan,
                    ];
                }
                if (!empty($r->konsultasi_id)) {
                    $konsultasi[] = [
                        'id' => $r->id,
                        'konsultasi_id' => $r->konsultasi_id,
                        'nama_tindakan' => $r->nama_tindakan,
                        'qty' => (int) $r->qty,
                        'tarif' => (float) $r->tarif,
                        'subtotal' => (float) $r->subtotal,
                        'tgl_layanan' => $r->tgl_layanan ?: $kj->tgl_kunjungan,
                    ];
                }
            }
        }

        // 2. Laboratorium dari lab_order -> lab_order_detail
        $labOrderIds = DB::table('lab_order')->where('kunjungan_id', $id)->pluck('id');
        $lab = [];
        if ($labOrderIds->isNotEmpty()) {
            $labRows = DB::table('lab_order_detail')->whereIn('lab_order_id', $labOrderIds)->get();
            foreach ($labRows as $r) {
                $lab[] = [
                    'id' => $r->id,
                    'lab_id' => $r->pemeriksaan_id,
                    'pemeriksaan_id' => $r->pemeriksaan_id,
                    'qty' => (int) $r->qty,
                    'tarif' => (float) $r->tarif,
                    'hasil' => $r->hasil,
                    'tgl_layanan' => $r->tgl_layanan ?: $kj->tgl_kunjungan,
                ];
            }
        }

        // 3. Radiologi dari rad_order -> rad_order_detail
        $radOrderIds = DB::table('rad_order')->where('kunjungan_id', $id)->pluck('id');
        $rad = [];
        if ($radOrderIds->isNotEmpty()) {
            $radRows = DB::table('rad_order_detail')->whereIn('rad_order_id', $radOrderIds)->get();
            foreach ($radRows as $r) {
                $rad[] = [
                    'id' => $r->id,
                    'rad_id' => $r->pemeriksaan_id,
                    'pemeriksaan_id' => $r->pemeriksaan_id,
                    'qty' => (int) $r->qty,
                    'tarif' => (float) $r->tarif,
                    'hasil' => $r->hasil,
                    'tgl_layanan' => $r->tgl_layanan ?: $kj->tgl_kunjungan,
                ];
            }
        }

        // 4. Diagnostik dari diag_order -> diag_order_detail
        $diagOrderIds = DB::table('diag_order')->where('kunjungan_id', $id)->pluck('id');
        $diag = [];
        if ($diagOrderIds->isNotEmpty()) {
            $diagRows = DB::table('diag_order_detail')->whereIn('diag_order_id', $diagOrderIds)->get();
            foreach ($diagRows as $r) {
                $diag[] = [
                    'id' => $r->id,
                    'diag_id' => $r->pemeriksaan_id,
                    'pemeriksaan_id' => $r->pemeriksaan_id,
                    'qty' => (int) $r->qty,
                    'tarif' => (float) $r->tarif,
                    'hasil' => $r->hasil,
                    'tgl_layanan' => $r->tgl_layanan ?: $kj->tgl_kunjungan,
                ];
            }
        }

        // 5. Fisioterapi dari fisio_order -> fisio_order_detail
        $fisioOrderIds = DB::table('fisio_order')->where('kunjungan_id', $id)->pluck('id');
        $fisio = [];
        if ($fisioOrderIds->isNotEmpty()) {
            $fisioRows = DB::table('fisio_order_detail')->whereIn('fisio_order_id', $fisioOrderIds)->get();
            foreach ($fisioRows as $r) {
                $fisio[] = [
                    'id' => $r->id,
                    'fisio_id' => $r->pemeriksaan_id,
                    'pemeriksaan_id' => $r->pemeriksaan_id,
                    'qty' => (int) $r->qty,
                    'tarif' => (float) $r->tarif,
                    'hasil' => $r->hasil,
                    'tgl_layanan' => $r->tgl_layanan ?: $kj->tgl_kunjungan,
                ];
            }
        }

        // 6. Resep / Obat dari resep -> resep_detail
        $resepIds = DB::table('resep')->where('kunjungan_id', $id)->pluck('id');
        $obat = [];
        if ($resepIds->isNotEmpty()) {
            $resepRows = DB::table('resep_detail')->whereIn('resep_id', $resepIds)->get();
            foreach ($resepRows as $r) {
                $obat[] = [
                    'id' => $r->id,
                    'obat_id' => $r->obat_id,
                    'qty' => (int) $r->qty,
                    'dosis' => $r->dosis,
                    'aturan_pakai' => $r->aturan_pakai,
                    'harga' => (float) $r->harga,
                    'subtotal' => (float) $r->subtotal,
                    'tgl_layanan' => $r->tgl_layanan ?: $kj->tgl_kunjungan,
                ];
            }
        }

        $invoice = DB::table('invoice')->where('kunjungan_id', $id)->first();

        $data = (array) $kj;
        $data['pasien'] = $pasien ? (array) $pasien : null;
        $data['tindakan'] = $tindakan;
        $data['konsultasi'] = $konsultasi;
        $data['lab'] = $lab;
        $data['rad'] = $rad;
        $data['diag'] = $diag;
        $data['fisio'] = $fisio;
        $data['obat'] = $obat;
        $data['invoice'] = $invoice;
        $data['invoice_id'] = $invoice?->id;
        $data['no_invoice'] = $invoice?->no_invoice;
        $data['can_edit'] = ($kj->status === 'billing') && ! $invoice;

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Daftarkan kunjungan baru & generate No. Antrean serta No. Kunjungan
     */
    public function store(Request $request): JsonResponse
    {
        if (! $request->has('poli_id') && $request->has('poliklinik_id')) {
            $request->merge(['poli_id' => $request->input('poliklinik_id')]);
        }
        if (! $request->has('keluhan_awal') && $request->has('keluhan_utama')) {
            $request->merge(['keluhan_awal' => $request->input('keluhan_utama')]);
        }
        if (! $request->has('jenis_penjamin') && $request->has('penjamin')) {
            $request->merge(['jenis_penjamin' => strtolower($request->input('penjamin'))]);
        }

        $validated = $request->validate([
            'pasien_id' => ['required', 'integer', 'exists:pasien,id'],
            'poli_id' => ['required', 'integer', 'exists:poli,id'],
            'dokter_id' => ['nullable', 'integer', 'exists:dokter,id'],
            'jenis_registrasi' => ['nullable', 'in:rawat_jalan,rawat_inap'],
            'tgl_kunjungan' => ['nullable', 'date'],
            'tgl_layanan' => ['nullable', 'date'],
            'lama_rawat' => ['nullable', 'integer', 'min:1'],
            'tgl_keluar' => ['nullable', 'date'],
            'jenis_penjamin' => ['nullable', 'in:umum,bpjs,asuransi,corporate,ar'],
            'asuransi_id' => ['nullable', 'integer', 'exists:asuransi,id'],
            'corporate_id' => ['nullable', 'integer', 'exists:corporate,id'],
            'no_jaminan' => ['nullable', 'string', 'max:50'],
            'keluhan_awal' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:menunggu,periksa,penunjang,farmasi,billing,pembayaran,selesai'],
        ]);

        $tglKunjungan = $validated['tgl_kunjungan'] ?? date('Y-m-d');
        $tglLayanan = $validated['tgl_layanan'] ?? $tglKunjungan;
        $jenisRegistrasi = $validated['jenis_registrasi'] ?? 'rawat_jalan';
        $lamaRawat = (int) ($validated['lama_rawat'] ?? 1);
        $tglKeluar = null;

        if ($jenisRegistrasi === 'rawat_inap') {
            $tglKeluar = $validated['tgl_keluar'] ?? date('Y-m-d', strtotime("{$tglKunjungan} + " . ($lamaRawat - 1) . ' days'));
        }

        // Generate No. Antrean per poli pada tanggal kunjungan
        $nextAntrean = (int) DB::table('kunjungan')
            ->where('poli_id', $validated['poli_id'])
            ->where('tgl_kunjungan', $tglKunjungan)
            ->max('no_antrian') + 1;

        // Generate No. Kunjungan: KJ-YYYYMMDD-XXXX
        $dateStr = str_replace('-', '', $tglKunjungan);
        $prefixLike = 'KJ-' . $dateStr . '-%';
        $countToday = (int) DB::table('kunjungan')->where('no_kunjungan', 'LIKE', $prefixLike)->count() + 1;
        $noKunjungan = sprintf('KJ-%s-%04d', $dateStr, $countToday);

        $userId = $request->user()?->id;
        $statusKunjungan = $validated['status'] ?? $request->input('status', 'menunggu');

        $kunjunganId = DB::table('kunjungan')->insertGetId([
            'no_kunjungan' => $noKunjungan,
            'pasien_id' => $validated['pasien_id'],
            'poli_id' => $validated['poli_id'],
            'dokter_id' => $validated['dokter_id'] ?? null,
            'jenis_registrasi' => $jenisRegistrasi,
            'tgl_kunjungan' => $tglKunjungan,
            'tgl_keluar' => $tglKeluar,
            'lama_rawat' => $lamaRawat,
            'no_antrian' => $nextAntrean,
            'jenis_penjamin' => $validated['jenis_penjamin'] ?? 'umum',
            'asuransi_id' => $validated['asuransi_id'] ?? null,
            'corporate_id' => $validated['corporate_id'] ?? null,
            'no_jaminan' => $validated['no_jaminan'] ?? null,
            'status' => $statusKunjungan,
            'keluhan_awal' => $validated['keluhan_awal'] ?? null,
            'user_id' => $userId,
            'created_at' => now(),
        ]);

        $poliKode = DB::table('poli')->where('id', $validated['poli_id'])->value('kode') ?? 'POLI';
        $kodeAntrean = sprintf('%s-%03d', $poliKode, $nextAntrean);

        // Optional: Save services, orders, and medications if provided (matching legacy daftar.php)
        try {
            $tindakanList = $request->input('tindakan', $request->input('tindakan_list', []));
            $konsultasiList = $request->input('konsultasi', $request->input('konsultasi_list', []));
            if (!empty($tindakanList) || !empty($konsultasiList)) {
                $rmId = DB::table('rekam_medis')->insertGetId([
                    'kunjungan_id' => $kunjunganId,
                    'dokter_id' => $validated['dokter_id'] ?? null,
                    'created_at' => now(),
                ]);
                foreach ($tindakanList as $t) {
                    $tid = (int)($t['tindakan_id'] ?? 0);
                    $qty = max(1, (int)($t['qty'] ?? 1));
                    $itemTgl = $t['tgl_layanan'] ?? $tglLayanan;
                    if ($tid) {
                        $m = DB::table('tindakan')->where('id', $tid)->first();
                        if ($m) {
                            $hj = (float)($m->harga_jual ?? 0);
                            $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                            DB::table('rm_tindakan')->insert([
                                'rekam_medis_id' => $rmId,
                                'tgl_layanan' => $itemTgl,
                                'tindakan_id' => $tid,
                                'nama_tindakan' => $m->nama,
                                'qty' => $qty,
                                'tarif' => $tarif,
                                'subtotal' => $tarif * $qty,
                            ]);
                        }
                    }
                }
                foreach ($konsultasiList as $k) {
                    $kid = (int)($k['konsultasi_id'] ?? 0);
                    $qty = max(1, (int)($k['qty'] ?? 1));
                    $itemTgl = $k['tgl_layanan'] ?? $tglLayanan;
                    if ($kid) {
                        $m = DB::table('konsultasi')->where('id', $kid)->first();
                        if ($m) {
                            $hj = (float)($m->harga_jual ?? 0);
                            $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                            DB::table('rm_tindakan')->insert([
                                'rekam_medis_id' => $rmId,
                                'tgl_layanan' => $itemTgl,
                                'konsultasi_id' => $kid,
                                'nama_tindakan' => $m->nama,
                                'qty' => $qty,
                                'tarif' => $tarif,
                                'subtotal' => $tarif * $qty,
                            ]);
                        }
                    }
                }
            }

            $labList = $request->input('lab', []);
            if (!empty($labList)) {
                $labOrderId = DB::table('lab_order')->insertGetId([
                    'kunjungan_id' => $kunjunganId,
                    'status' => 'permintaan',
                    'tanggal' => $tglLayanan,
                ]);
                foreach ($labList as $l) {
                    $pid = (int)($l['lab_id'] ?? ($l['pemeriksaan_id'] ?? 0));
                    $qty = max(1, (int)($l['qty'] ?? 1));
                    $itemTgl = $l['tgl_layanan'] ?? $tglLayanan;
                    if ($pid) {
                        $m = DB::table('lab_pemeriksaan')->where('id', $pid)->first();
                        if ($m) {
                            $hj = (float)($m->harga_jual ?? 0);
                            $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                            DB::table('lab_order_detail')->insert([
                                'lab_order_id' => $labOrderId,
                                'tgl_layanan' => $itemTgl,
                                'pemeriksaan_id' => $pid,
                                'hasil' => $l['hasil'] ?? null,
                                'nilai_rujukan' => $m->nilai_rujukan ?? null,
                                'tarif' => $tarif,
                                'qty' => $qty,
                                'subtotal' => $tarif * $qty,
                            ]);
                        }
                    }
                }
            }

            $radList = $request->input('rad', []);
            if (!empty($radList)) {
                $radOrderId = DB::table('rad_order')->insertGetId([
                    'kunjungan_id' => $kunjunganId,
                    'status' => 'permintaan',
                    'tanggal' => $tglLayanan,
                ]);
                foreach ($radList as $r) {
                    $pid = (int)($r['rad_id'] ?? ($r['pemeriksaan_id'] ?? 0));
                    $qty = max(1, (int)($r['qty'] ?? 1));
                    $itemTgl = $r['tgl_layanan'] ?? $tglLayanan;
                    if ($pid) {
                        $m = DB::table('rad_pemeriksaan')->where('id', $pid)->first();
                        if ($m) {
                            $hj = (float)($m->harga_jual ?? 0);
                            $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                            DB::table('rad_order_detail')->insert([
                                'rad_order_id' => $radOrderId,
                                'tgl_layanan' => $itemTgl,
                                'pemeriksaan_id' => $pid,
                                'hasil' => $r['hasil'] ?? null,
                                'tarif' => $tarif,
                                'qty' => $qty,
                                'subtotal' => $tarif * $qty,
                            ]);
                        }
                    }
                }
            }

            $diagList = $request->input('diag', []);
            if (!empty($diagList)) {
                $diagOrderId = DB::table('diag_order')->insertGetId([
                    'kunjungan_id' => $kunjunganId,
                    'status' => 'permintaan',
                    'tanggal' => $tglLayanan,
                ]);
                foreach ($diagList as $d) {
                    $pid = (int)($d['diag_id'] ?? ($d['pemeriksaan_id'] ?? 0));
                    $qty = max(1, (int)($d['qty'] ?? 1));
                    $itemTgl = $d['tgl_layanan'] ?? $tglLayanan;
                    if ($pid) {
                        $m = DB::table('diag_pemeriksaan')->where('id', $pid)->first();
                        if ($m) {
                            $hj = (float)($m->harga_jual ?? 0);
                            $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                            DB::table('diag_order_detail')->insert([
                                'diag_order_id' => $diagOrderId,
                                'tgl_layanan' => $itemTgl,
                                'pemeriksaan_id' => $pid,
                                'hasil' => $d['hasil'] ?? null,
                                'tarif' => $tarif,
                                'qty' => $qty,
                                'subtotal' => $tarif * $qty,
                            ]);
                        }
                    }
                }
            }

            $fisioList = $request->input('fisio', []);
            if (!empty($fisioList)) {
                $fisioOrderId = DB::table('fisio_order')->insertGetId([
                    'kunjungan_id' => $kunjunganId,
                    'status' => 'permintaan',
                    'tanggal' => $tglLayanan,
                ]);
                foreach ($fisioList as $f) {
                    $pid = (int)($f['fisio_id'] ?? ($f['pemeriksaan_id'] ?? 0));
                    $qty = max(1, (int)($f['qty'] ?? 1));
                    $itemTgl = $f['tgl_layanan'] ?? $tglLayanan;
                    if ($pid) {
                        $m = DB::table('fisio_pemeriksaan')->where('id', $pid)->first();
                        if ($m) {
                            $hj = (float)($m->harga_jual ?? 0);
                            $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                            DB::table('fisio_order_detail')->insert([
                                'fisio_order_id' => $fisioOrderId,
                                'tgl_layanan' => $itemTgl,
                                'pemeriksaan_id' => $pid,
                                'hasil' => $f['hasil'] ?? null,
                                'tarif' => $tarif,
                                'qty' => $qty,
                                'subtotal' => $tarif * $qty,
                            ]);
                        }
                    }
                }
            }

            $obatList = $request->input('obat', $request->input('obat_list', []));
            if (!empty($obatList)) {
                $resepId = DB::table('resep')->insertGetId([
                    'kunjungan_id' => $kunjunganId,
                    'dokter_id' => $validated['dokter_id'] ?? null,
                    'status' => 'baru',
                    'tanggal' => $tglLayanan,
                ]);
                foreach ($obatList as $o) {
                    $oid = (int)($o['obat_id'] ?? 0);
                    $qty = max(1, (int)($o['qty'] ?? 1));
                    $itemTgl = $o['tgl_layanan'] ?? $tglLayanan;
                    if ($oid) {
                        $m = DB::table('obat')->where('id', $oid)->first();
                        if ($m) {
                            $hj = (float)($m->harga_jual ?? 0);
                            $tarif = $hj > 0 ? $hj : round(((float)$m->harga_beli) * 1.40, 2);
                            DB::table('resep_detail')->insert([
                                'resep_id' => $resepId,
                                'tgl_layanan' => $itemTgl,
                                'obat_id' => $oid,
                                'qty' => $qty,
                                'dosis' => $o['dosis'] ?? null,
                                'aturan_pakai' => $o['aturan_pakai'] ?? null,
                                'harga' => $tarif,
                                'subtotal' => $tarif * $qty,
                            ]);
                        }
                    }
                }
            }

            // Inisialisasi Draft Billing & Rincian Administrasi (Default Biaya Administrasi = 0)
            $biayaAdmin = 0;
            $svcSubtotal = 0;
            $billingDetails = [];

            // 1. Administrasi & Registrasi (hanya jika biayaAdmin > 0)
            if ($biayaAdmin > 0) {
                $billingDetails[] = [
                    'tgl_layanan' => $tglLayanan,
                    'kategori' => 'administrasi',
                    'item_code' => 'GBKAD0001',
                    'deskripsi' => 'Biaya Administrasi & Registrasi',
                    'qty' => 1,
                    'tarif' => $biayaAdmin,
                    'subtotal' => $biayaAdmin,
                ];
            }

            // 2. Tindakan & Konsultasi
            if (isset($rmId)) {
                $rmTind = DB::table('rm_tindakan')->where('rekam_medis_id', $rmId)->get();
                foreach ($rmTind as $rt) {
                    $svcSubtotal += (float)$rt->subtotal;
                    $billingDetails[] = [
                        'tgl_layanan' => $rt->tgl_layanan,
                        'kategori' => !empty($rt->konsultasi_id) ? 'konsultasi' : 'tindakan',
                        'item_code' => !empty($rt->konsultasi_id) ? 'KONS' : 'TIND',
                        'deskripsi' => $rt->nama_tindakan,
                        'qty' => (int)$rt->qty,
                        'tarif' => (float)$rt->tarif,
                        'subtotal' => (float)$rt->subtotal,
                    ];
                }
            }

            // 3. Lab
            if (isset($labOrderId)) {
                $labDetails = DB::table('lab_order_detail as lod')
                    ->join('lab_pemeriksaan as lp', 'lp.id', '=', 'lod.pemeriksaan_id')
                    ->where('lod.lab_order_id', $labOrderId)
                    ->select('lod.*', 'lp.kode', 'lp.nama')
                    ->get();
                foreach ($labDetails as $ld) {
                    $svcSubtotal += (float)$ld->subtotal;
                    $billingDetails[] = [
                        'tgl_layanan' => $ld->tgl_layanan,
                        'kategori' => 'laboratorium',
                        'item_code' => $ld->kode,
                        'deskripsi' => $ld->nama,
                        'qty' => (int)$ld->qty,
                        'tarif' => (float)$ld->tarif,
                        'subtotal' => (float)$ld->subtotal,
                    ];
                }
            }

            // 4. Rad
            if (isset($radOrderId)) {
                $radDetails = DB::table('rad_order_detail as rod')
                    ->join('rad_pemeriksaan as rp', 'rp.id', '=', 'rod.pemeriksaan_id')
                    ->where('rod.rad_order_id', $radOrderId)
                    ->select('rod.*', 'rp.kode', 'rp.nama')
                    ->get();
                foreach ($radDetails as $rd) {
                    $svcSubtotal += (float)$rd->subtotal;
                    $billingDetails[] = [
                        'tgl_layanan' => $rd->tgl_layanan,
                        'kategori' => 'radiologi',
                        'item_code' => $rd->kode,
                        'deskripsi' => $rd->nama,
                        'qty' => (int)$rd->qty,
                        'tarif' => (float)$rd->tarif,
                        'subtotal' => (float)$rd->subtotal,
                    ];
                }
            }

            // 5. Diag
            if (isset($diagOrderId)) {
                $diagDetails = DB::table('diag_order_detail as dod')
                    ->join('diag_pemeriksaan as dp', 'dp.id', '=', 'dod.pemeriksaan_id')
                    ->where('dod.diag_order_id', $diagOrderId)
                    ->select('dod.*', 'dp.kode', 'dp.nama')
                    ->get();
                foreach ($diagDetails as $dd) {
                    $svcSubtotal += (float)$dd->subtotal;
                    $billingDetails[] = [
                        'tgl_layanan' => $dd->tgl_layanan,
                        'kategori' => 'diagnostik',
                        'item_code' => $dd->kode,
                        'deskripsi' => $dd->nama,
                        'qty' => (int)$dd->qty,
                        'tarif' => (float)$dd->tarif,
                        'subtotal' => (float)$dd->subtotal,
                    ];
                }
            }

            // 6. Fisio
            if (isset($fisioOrderId)) {
                $fisioDetails = DB::table('fisio_order_detail as fod')
                    ->join('fisio_pemeriksaan as fp', 'fp.id', '=', 'fod.pemeriksaan_id')
                    ->where('fod.fisio_order_id', $fisioOrderId)
                    ->select('fod.*', 'fp.kode', 'fp.nama')
                    ->get();
                foreach ($fisioDetails as $fd) {
                    $svcSubtotal += (float)$fd->subtotal;
                    $billingDetails[] = [
                        'tgl_layanan' => $fd->tgl_layanan,
                        'kategori' => 'fisioterapi',
                        'item_code' => $fd->kode,
                        'deskripsi' => $fd->nama,
                        'qty' => (int)$fd->qty,
                        'tarif' => (float)$fd->tarif,
                        'subtotal' => (float)$fd->subtotal,
                    ];
                }
            }

            // 7. Resep
            if (isset($resepId)) {
                $resepDetails = DB::table('resep_detail as rsd')
                    ->join('obat as o', 'o.id', '=', 'rsd.obat_id')
                    ->where('rsd.resep_id', $resepId)
                    ->select('rsd.*', 'o.kode', 'o.nama')
                    ->get();
                foreach ($resepDetails as $od) {
                    $svcSubtotal += (float)$od->subtotal;
                    $billingDetails[] = [
                        'tgl_layanan' => $od->tgl_layanan,
                        'kategori' => 'farmasi',
                        'item_code' => $od->kode,
                        'deskripsi' => $od->nama,
                        'qty' => (int)$od->qty,
                        'tarif' => (float)$od->harga,
                        'subtotal' => (float)$od->subtotal,
                    ];
                }
            }

            $subtotalTagihan = $svcSubtotal + $biayaAdmin;
            $totalTagihan = (float)(ceil($subtotalTagihan / 500) * 500);

            $billingId = DB::table('billing')->insertGetId([
                'kunjungan_id' => $kunjunganId,
                'subtotal' => $subtotalTagihan,
                'diskon' => 0,
                'total' => $totalTagihan,
                'cover_penjamin' => 0,
                'status' => 'draft',
                'created_at' => now(),
            ]);

            foreach ($billingDetails as $bd) {
                DB::table('billing_detail')->insert(array_merge($bd, ['billing_id' => $billingId]));
            }
        } catch (\Throwable $ex) {
            \Illuminate\Support\Facades\Log::error('Registration service error: ' . $ex->getMessage() . ' in ' . $ex->getFile() . ':' . $ex->getLine());
        }

        $respData = [
            'id' => $kunjunganId,
            'no_kunjungan' => $noKunjungan,
            'no_antrian' => $nextAntrean,
            'kode_antrean' => $kodeAntrean,
        ];

        return response()->json(array_merge([
            'success' => true,
            'message' => "Pendaftaran berhasil. No. Antrean: {$kodeAntrean}",
            'data' => $respData,
        ], $respData), 201);
    }

    /**
     * Update data kunjungan (hanya jika belum diproses/selesai)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $kunjungan = DB::table('kunjungan')->where('id', $id)->first();
        if (! $kunjungan) {
            return response()->json(['success' => false, 'message' => 'Kunjungan tidak ditemukan.'], 404);
        }

        $hasInvoice = DB::table('invoice')->where('kunjungan_id', $id)->exists();
        if ($kunjungan->status === 'pembayaran' || $hasInvoice) {
            return response()->json([
                'success' => false,
                'message' => 'Data kunjungan tidak dapat diedit karena sudah dalam proses pembayaran (invoice sudah dibuat).'
            ], 422);
        }

        if ($kunjungan->status !== 'billing') {
            return response()->json([
                'success' => false,
                'message' => 'Data kunjungan hanya dapat diedit jika statusnya masih billing (invoice belum dibuat).'
            ], 422);
        }

        if (! $request->has('poli_id') && $request->has('poliklinik_id')) {
            $request->merge(['poli_id' => $request->input('poliklinik_id')]);
        }
        if (! $request->has('keluhan_awal') && $request->has('keluhan_utama')) {
            $request->merge(['keluhan_awal' => $request->input('keluhan_utama')]);
        }
        if (! $request->has('jenis_penjamin') && $request->has('penjamin')) {
            $request->merge(['jenis_penjamin' => strtolower($request->input('penjamin'))]);
        }

        $validated = $request->validate([
            'pasien_id' => ['nullable', 'integer', 'exists:pasien,id'],
            'poli_id' => ['required', 'integer', 'exists:poli,id'],
            'dokter_id' => ['nullable', 'integer', 'exists:dokter,id'],
            'jenis_registrasi' => ['nullable', 'in:rawat_jalan,rawat_inap'],
            'tgl_kunjungan' => ['nullable', 'date'],
            'tgl_layanan' => ['nullable', 'date'],
            'lama_rawat' => ['nullable', 'integer', 'min:1'],
            'tgl_keluar' => ['nullable', 'date'],
            'jenis_penjamin' => ['nullable', 'in:umum,bpjs,asuransi,corporate,ar'],
            'asuransi_id' => ['nullable', 'integer', 'exists:asuransi,id'],
            'corporate_id' => ['nullable', 'integer', 'exists:corporate,id'],
            'no_jaminan' => ['nullable', 'string', 'max:50'],
            'keluhan_awal' => ['nullable', 'string', 'max:255'],
        ]);

        $tglKunjungan = $validated['tgl_kunjungan'] ?? $kunjungan->tgl_kunjungan;
        $tglLayanan = $validated['tgl_layanan'] ?? $tglKunjungan;
        $jenisRegistrasi = $validated['jenis_registrasi'] ?? $kunjungan->jenis_registrasi;
        $lamaRawat = (int) ($validated['lama_rawat'] ?? ($kunjungan->lama_rawat ?? 1));
        $tglKeluar = null;
        if ($jenisRegistrasi === 'rawat_inap') {
            $tglKeluar = $validated['tgl_keluar'] ?? ($kunjungan->tgl_keluar ?? date('Y-m-d', strtotime("{$tglKunjungan} + " . ($lamaRawat - 1) . ' days')));
        }

        $jenisPenjamin = $validated['jenis_penjamin'] ?? $kunjungan->jenis_penjamin;
        $asuransiId = ($jenisPenjamin === 'asuransi') ? ($validated['asuransi_id'] ?? null) : null;
        $corporateId = ($jenisPenjamin === 'corporate') ? ($validated['corporate_id'] ?? null) : null;
        $noJaminan = ($jenisPenjamin !== 'umum') ? ($validated['no_jaminan'] ?? null) : null;

        $updateData = [
            'poli_id' => $validated['poli_id'],
            'dokter_id' => $validated['dokter_id'] ?? null,
            'jenis_registrasi' => $jenisRegistrasi,
            'tgl_kunjungan' => $tglKunjungan,
            'lama_rawat' => $lamaRawat,
            'tgl_keluar' => $tglKeluar,
            'jenis_penjamin' => $jenisPenjamin,
            'asuransi_id' => $asuransiId,
            'corporate_id' => $corporateId,
            'no_jaminan' => $noJaminan,
            'keluhan_awal' => $validated['keluhan_awal'] ?? null,
            'updated_at' => now(),
        ];
        if (!empty($validated['pasien_id'])) {
            $updateData['pasien_id'] = $validated['pasien_id'];
        }

        DB::table('kunjungan')->where('id', $id)->update($updateData);

        // Optional: Re-sync services, orders, and medications if sent from edit form
        $hasServiceInputs = $request->has('tindakan') || $request->has('tindakan_list') ||
            $request->has('konsultasi') || $request->has('konsultasi_list') ||
            $request->has('lab') || $request->has('rad') || $request->has('diag') ||
            $request->has('fisio') || $request->has('obat') || $request->has('obat_list');

        if ($hasServiceInputs) {
            try {
                $tindakanList = $request->input('tindakan', $request->input('tindakan_list', []));
                $konsultasiList = $request->input('konsultasi', $request->input('konsultasi_list', []));

                $rmId = DB::table('rekam_medis')->where('kunjungan_id', $id)->value('id');
                if (!empty($tindakanList) || !empty($konsultasiList)) {
                    if (!$rmId) {
                        $rmId = DB::table('rekam_medis')->insertGetId([
                            'kunjungan_id' => $id,
                            'dokter_id' => $validated['dokter_id'] ?? null,
                            'created_at' => now(),
                        ]);
                    } else {
                        DB::table('rekam_medis')->where('id', $rmId)->update([
                            'dokter_id' => $validated['dokter_id'] ?? null,
                        ]);
                    }

                    DB::table('rm_tindakan')->where('rekam_medis_id', $rmId)->delete();

                    foreach ($tindakanList as $t) {
                        $tid = (int)($t['tindakan_id'] ?? 0);
                        $qty = max(1, (int)($t['qty'] ?? 1));
                        $itemTgl = $t['tgl_layanan'] ?? $tglLayanan;
                        if ($tid) {
                            $m = DB::table('tindakan')->where('id', $tid)->first();
                            if ($m) {
                                $hj = (float)($m->harga_jual ?? 0);
                                $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                                DB::table('rm_tindakan')->insert([
                                    'rekam_medis_id' => $rmId,
                                    'tgl_layanan' => $itemTgl,
                                    'tindakan_id' => $tid,
                                    'nama_tindakan' => $m->nama,
                                    'qty' => $qty,
                                    'tarif' => $tarif,
                                    'subtotal' => $tarif * $qty,
                                ]);
                            }
                        }
                    }

                    foreach ($konsultasiList as $k) {
                        $kid = (int)($k['konsultasi_id'] ?? 0);
                        $qty = max(1, (int)($k['qty'] ?? 1));
                        $itemTgl = $k['tgl_layanan'] ?? $tglLayanan;
                        if ($kid) {
                            $m = DB::table('konsultasi')->where('id', $kid)->first();
                            if ($m) {
                                $hj = (float)($m->harga_jual ?? 0);
                                $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                                DB::table('rm_tindakan')->insert([
                                    'rekam_medis_id' => $rmId,
                                    'tgl_layanan' => $itemTgl,
                                    'konsultasi_id' => $kid,
                                    'nama_tindakan' => $m->nama,
                                    'qty' => $qty,
                                    'tarif' => $tarif,
                                    'subtotal' => $tarif * $qty,
                                ]);
                            }
                        }
                    }
                } elseif ($rmId) {
                    DB::table('rm_tindakan')->where('rekam_medis_id', $rmId)->delete();
                }

                // Lab
                $labList = $request->input('lab', []);
                $labOrderId = DB::table('lab_order')->where('kunjungan_id', $id)->value('id');
                if (!empty($labList)) {
                    if (!$labOrderId) {
                        $labOrderId = DB::table('lab_order')->insertGetId([
                            'kunjungan_id' => $id,
                            'status' => 'permintaan',
                            'tanggal' => $tglLayanan,
                        ]);
                    }
                    DB::table('lab_order_detail')->where('lab_order_id', $labOrderId)->delete();
                    foreach ($labList as $l) {
                        $pid = (int)($l['lab_id'] ?? ($l['pemeriksaan_id'] ?? 0));
                        $qty = max(1, (int)($l['qty'] ?? 1));
                        $itemTgl = $l['tgl_layanan'] ?? $tglLayanan;
                        if ($pid) {
                            $m = DB::table('lab_pemeriksaan')->where('id', $pid)->first();
                            if ($m) {
                                $hj = (float)($m->harga_jual ?? 0);
                                $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                                DB::table('lab_order_detail')->insert([
                                    'lab_order_id' => $labOrderId,
                                    'tgl_layanan' => $itemTgl,
                                    'pemeriksaan_id' => $pid,
                                    'hasil' => $l['hasil'] ?? null,
                                    'nilai_rujukan' => $m->nilai_rujukan ?? null,
                                    'tarif' => $tarif,
                                    'qty' => $qty,
                                    'subtotal' => $tarif * $qty,
                                ]);
                            }
                        }
                    }
                } elseif ($labOrderId) {
                    DB::table('lab_order_detail')->where('lab_order_id', $labOrderId)->delete();
                }

                // Rad
                $radList = $request->input('rad', []);
                $radOrderId = DB::table('rad_order')->where('kunjungan_id', $id)->value('id');
                if (!empty($radList)) {
                    if (!$radOrderId) {
                        $radOrderId = DB::table('rad_order')->insertGetId([
                            'kunjungan_id' => $id,
                            'status' => 'permintaan',
                            'tanggal' => $tglLayanan,
                        ]);
                    }
                    DB::table('rad_order_detail')->where('rad_order_id', $radOrderId)->delete();
                    foreach ($radList as $r) {
                        $pid = (int)($r['rad_id'] ?? ($r['pemeriksaan_id'] ?? 0));
                        $qty = max(1, (int)($r['qty'] ?? 1));
                        $itemTgl = $r['tgl_layanan'] ?? $tglLayanan;
                        if ($pid) {
                            $m = DB::table('rad_pemeriksaan')->where('id', $pid)->first();
                            if ($m) {
                                $hj = (float)($m->harga_jual ?? 0);
                                $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                                DB::table('rad_order_detail')->insert([
                                    'rad_order_id' => $radOrderId,
                                    'tgl_layanan' => $itemTgl,
                                    'pemeriksaan_id' => $pid,
                                    'hasil' => $r['hasil'] ?? null,
                                    'tarif' => $tarif,
                                    'qty' => $qty,
                                    'subtotal' => $tarif * $qty,
                                ]);
                            }
                        }
                    }
                } elseif ($radOrderId) {
                    DB::table('rad_order_detail')->where('rad_order_id', $radOrderId)->delete();
                }

                // Diag
                $diagList = $request->input('diag', []);
                $diagOrderId = DB::table('diag_order')->where('kunjungan_id', $id)->value('id');
                if (!empty($diagList)) {
                    if (!$diagOrderId) {
                        $diagOrderId = DB::table('diag_order')->insertGetId([
                            'kunjungan_id' => $id,
                            'status' => 'permintaan',
                            'tanggal' => $tglLayanan,
                        ]);
                    }
                    DB::table('diag_order_detail')->where('diag_order_id', $diagOrderId)->delete();
                    foreach ($diagList as $d) {
                        $pid = (int)($d['diag_id'] ?? ($d['pemeriksaan_id'] ?? 0));
                        $qty = max(1, (int)($d['qty'] ?? 1));
                        $itemTgl = $d['tgl_layanan'] ?? $tglLayanan;
                        if ($pid) {
                            $m = DB::table('diag_pemeriksaan')->where('id', $pid)->first();
                            if ($m) {
                                $hj = (float)($m->harga_jual ?? 0);
                                $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                                DB::table('diag_order_detail')->insert([
                                    'diag_order_id' => $diagOrderId,
                                    'tgl_layanan' => $itemTgl,
                                    'pemeriksaan_id' => $pid,
                                    'hasil' => $d['hasil'] ?? null,
                                    'tarif' => $tarif,
                                    'qty' => $qty,
                                    'subtotal' => $tarif * $qty,
                                ]);
                            }
                        }
                    }
                } elseif ($diagOrderId) {
                    DB::table('diag_order_detail')->where('diag_order_id', $diagOrderId)->delete();
                }

                // Fisio
                $fisioList = $request->input('fisio', []);
                $fisioOrderId = DB::table('fisio_order')->where('kunjungan_id', $id)->value('id');
                if (!empty($fisioList)) {
                    if (!$fisioOrderId) {
                        $fisioOrderId = DB::table('fisio_order')->insertGetId([
                            'kunjungan_id' => $id,
                            'status' => 'permintaan',
                            'tanggal' => $tglLayanan,
                        ]);
                    }
                    DB::table('fisio_order_detail')->where('fisio_order_id', $fisioOrderId)->delete();
                    foreach ($fisioList as $f) {
                        $pid = (int)($f['fisio_id'] ?? ($f['pemeriksaan_id'] ?? 0));
                        $qty = max(1, (int)($f['qty'] ?? 1));
                        $itemTgl = $f['tgl_layanan'] ?? $tglLayanan;
                        if ($pid) {
                            $m = DB::table('fisio_pemeriksaan')->where('id', $pid)->first();
                            if ($m) {
                                $hj = (float)($m->harga_jual ?? 0);
                                $tarif = $hj > 0 ? $hj : round(((float)$m->tarif) * 1.40, 2);
                                DB::table('fisio_order_detail')->insert([
                                    'fisio_order_id' => $fisioOrderId,
                                    'tgl_layanan' => $itemTgl,
                                    'pemeriksaan_id' => $pid,
                                    'hasil' => $f['hasil'] ?? null,
                                    'tarif' => $tarif,
                                    'qty' => $qty,
                                    'subtotal' => $tarif * $qty,
                                ]);
                            }
                        }
                    }
                } elseif ($fisioOrderId) {
                    DB::table('fisio_order_detail')->where('fisio_order_id', $fisioOrderId)->delete();
                }

                // Resep
                $obatList = $request->input('obat', $request->input('obat_list', []));
                $resepId = DB::table('resep')->where('kunjungan_id', $id)->value('id');
                if (!empty($obatList)) {
                    if (!$resepId) {
                        $resepId = DB::table('resep')->insertGetId([
                            'kunjungan_id' => $id,
                            'dokter_id' => $validated['dokter_id'] ?? null,
                            'status' => 'baru',
                            'tanggal' => $tglLayanan,
                        ]);
                    } else {
                        DB::table('resep')->where('id', $resepId)->update([
                            'dokter_id' => $validated['dokter_id'] ?? null,
                        ]);
                    }
                    DB::table('resep_detail')->where('resep_id', $resepId)->delete();
                    foreach ($obatList as $o) {
                        $oid = (int)($o['obat_id'] ?? 0);
                        $qty = max(1, (int)($o['qty'] ?? 1));
                        $itemTgl = $o['tgl_layanan'] ?? $tglLayanan;
                        if ($oid) {
                            $m = DB::table('obat')->where('id', $oid)->first();
                            if ($m) {
                                $hj = (float)($m->harga_jual ?? 0);
                                $tarif = $hj > 0 ? $hj : round(((float)$m->harga_beli) * 1.40, 2);
                                DB::table('resep_detail')->insert([
                                    'resep_id' => $resepId,
                                    'tgl_layanan' => $itemTgl,
                                    'obat_id' => $oid,
                                    'qty' => $qty,
                                    'dosis' => $o['dosis'] ?? null,
                                    'aturan_pakai' => $o['aturan_pakai'] ?? null,
                                    'harga' => $tarif,
                                    'subtotal' => $tarif * $qty,
                                ]);
                            }
                        }
                    }
                } elseif ($resepId) {
                    DB::table('resep_detail')->where('resep_id', $resepId)->delete();
                }

                // Sinkronisasi Billing (hanya jika billing berstatus draft)
                $billing = DB::table('billing')->where('kunjungan_id', $id)->first();
                if ($billing && $billing->status === 'draft') {
                    $svcSubtotal = 0;
                    $billingDetails = [];

                    if (!empty($rmId)) {
                        $rmTind = DB::table('rm_tindakan')->where('rekam_medis_id', $rmId)->get();
                        foreach ($rmTind as $rt) {
                            $svcSubtotal += (float)$rt->subtotal;
                            $billingDetails[] = [
                                'tgl_layanan' => $rt->tgl_layanan,
                                'kategori' => !empty($rt->konsultasi_id) ? 'konsultasi' : 'tindakan',
                                'item_code' => !empty($rt->konsultasi_id) ? 'KONS' : 'TIND',
                                'deskripsi' => $rt->nama_tindakan,
                                'qty' => (int)$rt->qty,
                                'tarif' => (float)$rt->tarif,
                                'subtotal' => (float)$rt->subtotal,
                            ];
                        }
                    }

                    if (!empty($labOrderId)) {
                        $labDetails = DB::table('lab_order_detail as lod')
                            ->join('lab_pemeriksaan as lp', 'lp.id', '=', 'lod.pemeriksaan_id')
                            ->where('lod.lab_order_id', $labOrderId)
                            ->select('lod.*', 'lp.kode', 'lp.nama')
                            ->get();
                        foreach ($labDetails as $ld) {
                            $svcSubtotal += (float)$ld->subtotal;
                            $billingDetails[] = [
                                'tgl_layanan' => $ld->tgl_layanan,
                                'kategori' => 'laboratorium',
                                'item_code' => $ld->kode,
                                'deskripsi' => $ld->nama,
                                'qty' => (int)$ld->qty,
                                'tarif' => (float)$ld->tarif,
                                'subtotal' => (float)$ld->subtotal,
                            ];
                        }
                    }

                    if (!empty($radOrderId)) {
                        $radDetails = DB::table('rad_order_detail as rod')
                            ->join('rad_pemeriksaan as rp', 'rp.id', '=', 'rod.pemeriksaan_id')
                            ->where('rod.rad_order_id', $radOrderId)
                            ->select('rod.*', 'rp.kode', 'rp.nama')
                            ->get();
                        foreach ($radDetails as $rd) {
                            $svcSubtotal += (float)$rd->subtotal;
                            $billingDetails[] = [
                                'tgl_layanan' => $rd->tgl_layanan,
                                'kategori' => 'radiologi',
                                'item_code' => $rd->kode,
                                'deskripsi' => $rd->nama,
                                'qty' => (int)$rd->qty,
                                'tarif' => (float)$rd->tarif,
                                'subtotal' => (float)$rd->subtotal,
                            ];
                        }
                    }

                    if (!empty($diagOrderId)) {
                        $diagDetails = DB::table('diag_order_detail as dod')
                            ->join('diag_pemeriksaan as dp', 'dp.id', '=', 'dod.pemeriksaan_id')
                            ->where('dod.diag_order_id', $diagOrderId)
                            ->select('dod.*', 'dp.kode', 'dp.nama')
                            ->get();
                        foreach ($diagDetails as $dd) {
                            $svcSubtotal += (float)$dd->subtotal;
                            $billingDetails[] = [
                                'tgl_layanan' => $dd->tgl_layanan,
                                'kategori' => 'diagnostik',
                                'item_code' => $dd->kode,
                                'deskripsi' => $dd->nama,
                                'qty' => (int)$dd->qty,
                                'tarif' => (float)$dd->tarif,
                                'subtotal' => (float)$dd->subtotal,
                            ];
                        }
                    }

                    if (!empty($fisioOrderId)) {
                        $fisioDetails = DB::table('fisio_order_detail as fod')
                            ->join('fisio_pemeriksaan as fp', 'fp.id', '=', 'fod.pemeriksaan_id')
                            ->where('fod.fisio_order_id', $fisioOrderId)
                            ->select('fod.*', 'fp.kode', 'fp.nama')
                            ->get();
                        foreach ($fisioDetails as $fd) {
                            $svcSubtotal += (float)$fd->subtotal;
                            $billingDetails[] = [
                                'tgl_layanan' => $fd->tgl_layanan,
                                'kategori' => 'fisioterapi',
                                'item_code' => $fd->kode,
                                'deskripsi' => $fd->nama,
                                'qty' => (int)$fd->qty,
                                'tarif' => (float)$fd->tarif,
                                'subtotal' => (float)$fd->subtotal,
                            ];
                        }
                    }

                    if (!empty($resepId)) {
                        $resepDetails = DB::table('resep_detail as rsd')
                            ->join('obat as o', 'o.id', '=', 'rsd.obat_id')
                            ->where('rsd.resep_id', $resepId)
                            ->select('rsd.*', 'o.kode', 'o.nama')
                            ->get();
                        foreach ($resepDetails as $od) {
                            $svcSubtotal += (float)$od->subtotal;
                            $billingDetails[] = [
                                'tgl_layanan' => $od->tgl_layanan,
                                'kategori' => 'farmasi',
                                'item_code' => $od->kode,
                                'deskripsi' => $od->nama,
                                'qty' => (int)$od->qty,
                                'tarif' => (float)$od->harga,
                                'subtotal' => (float)$od->subtotal,
                            ];
                        }
                    }

                    DB::table('billing_detail')->where('billing_id', $billing->id)->delete();
                    foreach ($billingDetails as $bd) {
                        DB::table('billing_detail')->insert(array_merge($bd, ['billing_id' => $billing->id]));
                    }

                    $totalTagihan = (float)(ceil($svcSubtotal / 500) * 500);
                    DB::table('billing')->where('id', $billing->id)->update([
                        'subtotal' => $svcSubtotal,
                        'total' => $totalTagihan,
                        'updated_at' => now(),
                    ]);
                }
            } catch (\Throwable $ex) {
                \Illuminate\Support\Facades\Log::error('Registration update service error: ' . $ex->getMessage() . ' in ' . $ex->getFile() . ':' . $ex->getLine());
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Data kunjungan berhasil diperbarui.',
        ]);
    }

    /**
     * Memperbarui status antrean kunjungan (menunggu -> periksa -> selesai)
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $kunjungan = DB::table('kunjungan')->where('id', $id)->first();
        if (! $kunjungan) {
            return response()->json(['success' => false, 'message' => 'Kunjungan tidak ditemukan.'], 404);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:menunggu,periksa,penunjang,farmasi,billing,pembayaran,selesai'],
        ]);

        DB::table('kunjungan')->where('id', $id)->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => "Status kunjungan diperbarui menjadi '{$validated['status']}'.",
            'status' => $validated['status'],
        ]);
    }

    /**
     * Membatalkan kunjungan dengan kode pembatalan dan alasan
     */
    public function batal(Request $request, int $id): JsonResponse
    {
        $kunjungan = DB::table('kunjungan')->where('id', $id)->first();
        if (! $kunjungan) {
            return response()->json(['success' => false, 'message' => 'Kunjungan tidak ditemukan.'], 404);
        }

        if ($kunjungan->status === 'batal') {
            return response()->json(['success' => false, 'message' => 'Kunjungan ini sudah dibatalkan sebelumnya.'], 422);
        }

        if ($kunjungan->status === 'selesai') {
            return response()->json(['success' => false, 'message' => 'Kunjungan yang sudah selesai tidak dapat dibatalkan.'], 422);
        }

        $validated = $request->validate([
            'kode_pembatalan_id' => ['required', 'integer', 'exists:kode_pembatalan,id'],
            'alasan_batal' => ['nullable', 'string', 'max:255'],
        ]);

        $kp = DB::table('kode_pembatalan')->where('id', $validated['kode_pembatalan_id'])->first();
        $alasan = ! empty($validated['alasan_batal']) ? $validated['alasan_batal'] : ($kp->nama ?? 'Dibatalkan');
        $userId = $request->user()?->id;

        try {
            DB::beginTransaction();

            DB::table('kunjungan')->where('id', $id)->update([
                'status' => 'batal',
                'kode_pembatalan_id' => $kp->id,
                'alasan_batal' => $alasan,
                'batal_at' => now(),
                'batal_by' => $userId,
            ]);

            // 1. Bersihkan pembayaran & invoice terlebih dahulu (karena invoice referensikan billing_id)
            $invoiceId = DB::table('invoice')->where('kunjungan_id', $id)->value('id');
            if ($invoiceId) {
                DB::table('pembayaran')->where('invoice_id', $invoiceId)->delete();
                DB::table('invoice')->where('id', $invoiceId)->delete();
            }

            // 2. Bersihkan billing_detail & billing
            $billingId = DB::table('billing')->where('kunjungan_id', $id)->value('id');
            if ($billingId) {
                DB::table('billing_detail')->where('billing_id', $billingId)->delete();
                DB::table('billing')->where('id', $billingId)->delete();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Kunjungan {$kunjungan->no_kunjungan} berhasil dibatalkan ({$kp->kode} - {$kp->nama}).",
            ]);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal membatalkan kunjungan: ' . $e->getMessage(),
            ], 500);
        }
    }
}
