<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class PelayananController extends Controller
{
    /**
     * Daftar antrean pasien untuk pemeriksaan dokter
     */
    public function antrean(Request $request): JsonResponse
    {
        $tgl = $request->query('tgl', date('Y-m-d'));
        $poliId = $request->query('poli_id');

        $query = DB::table('kunjungan as k')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->select(
                'k.id',
                'k.no_kunjungan',
                'k.no_antrian',
                'k.status',
                'k.keluhan_awal',
                'k.jenis_registrasi',
                'k.tgl_kunjungan',
                'p.id as pasien_id',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.jenis_kelamin as pasien_jk',
                'p.tgl_lahir as pasien_tgl_lahir',
                'p.alergi as pasien_alergi',
                'p.telepon as pasien_telepon',
                'po.id as poli_id',
                'po.kode as poli_kode',
                'po.nama as poli_nama',
                'd.nama as dokter_nama'
            )
            ->where('k.tgl_kunjungan', $tgl)
            ->where('k.status', '!=', 'batal');

        if (! empty($poliId)) {
            $query->where('k.poli_id', $poliId);
        }

        $rows = $query->orderBy('po.nama')->orderBy('k.no_antrian')->get();

        return response()->json([
            'success' => true,
            'data' => $rows,
            'total' => $rows->count(),
            'tgl' => $tgl,
        ]);
    }

    /**
     * Master lookups untuk pemeriksaan dokter (Tindakan, Obat, Lab, Rad, dll.)
     */
    public function lookups(): JsonResponse
    {
        $tindakan = DB::table('tindakan')
            ->where('status', 'aktif')
            ->orderBy('nama')
            ->get(['id', 'nama', 'tarif', 'harga_jual']);

        $obat = DB::table('obat as o')
            ->leftJoin('obat_satuan as s', 's.id', '=', 'o.satuan_id')
            ->where('o.status', 'aktif')
            ->orderBy('o.nama')
            ->get([
                'o.id',
                'o.nama',
                'o.harga_beli',
                'o.harga_jual',
                'o.stok',
                's.nama as satuan_nama',
            ]);

        $lab = DB::table('lab_pemeriksaan')
            ->where('status', 'aktif')
            ->orderBy('nama')
            ->get(['id', 'nama', 'nilai_rujukan', 'tarif', 'harga_jual']);

        $rad = DB::table('rad_pemeriksaan')
            ->where('status', 'aktif')
            ->orderBy('nama')
            ->get(['id', 'nama', 'tarif', 'harga_jual']);

        // Data umum ICD-10 untuk autocomplete
        $commonIcd10 = [
            ['kode' => 'A09', 'nama' => 'Gastroenteritis and colitis of unspecified origin (Diare)'],
            ['kode' => 'J00', 'nama' => 'Acute nasopharyngitis (Common cold)'],
            ['kode' => 'J02.9', 'nama' => 'Acute pharyngitis, unspecified (Faringitis)'],
            ['kode' => 'J06.9', 'nama' => 'Acute upper respiratory infection, unspecified (ISPA)'],
            ['kode' => 'I10', 'nama' => 'Essential (primary) hypertension (Hipertensi)'],
            ['kode' => 'E11.9', 'nama' => 'Type 2 diabetes mellitus without complications'],
            ['kode' => 'K29.7', 'nama' => 'Gastritis, unspecified (Maag)'],
            ['kode' => 'R50.9', 'nama' => 'Fever, unspecified (Demam)'],
            ['kode' => 'R51', 'nama' => 'Headache (Sakit Kepala / Cephalgia)'],
            ['kode' => 'M79.1', 'nama' => 'Myalgia (Nyeri Otot)'],
            ['kode' => 'L20.9', 'nama' => 'Atopic dermatitis, unspecified (Eksim)'],
            ['kode' => 'B35.9', 'nama' => 'Dermatophytosis, unspecified (Infeksi Jamur Kulit)'],
        ];

        return response()->json([
            'success' => true,
            'tindakan' => $tindakan,
            'obat' => $obat,
            'lab' => $lab,
            'rad' => $rad,
            'icd10' => $commonIcd10,
        ]);
    }

    /**
     * Memuat data lembar periksa (kunjungan, RME saat ini, dan riwayat kunjungan terdahulu)
     */
    public function showPeriksa(int $kunjunganId): JsonResponse
    {
        $kj = DB::table('kunjungan as k')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->select(
                'k.*',
                'p.id as pasien_id',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.jenis_kelamin as pasien_jk',
                'p.tgl_lahir as pasien_tgl_lahir',
                'p.alergi as pasien_alergi',
                'p.riwayat_penyakit as pasien_riwayat_penyakit',
                'po.kode as poli_kode',
                'po.nama as poli_nama',
                'd.nama as dokter_nama'
            )
            ->where('k.id', $kunjunganId)
            ->first();

        if (! $kj) {
            return response()->json(['success' => false, 'message' => 'Kunjungan tidak ditemukan.'], 404);
        }

        // 1. Rekam Medis (SOAP & Vital Signs)
        $rm = DB::table('rekam_medis')->where('kunjungan_id', $kunjunganId)->first();
        $rmId = $rm?->id;

        // 2. Diagnosa
        $diagnosa = [];
        if ($rmId) {
            $diagnosa = DB::table('rm_diagnosa')->where('rekam_medis_id', $rmId)->get();
        }

        // 3. Tindakan
        $tindakan = [];
        if ($rmId) {
            $tindakan = DB::table('rm_tindakan')->where('rekam_medis_id', $rmId)->get();
        }

        // 4. Resep & Detail
        $resep = DB::table('resep')->where('kunjungan_id', $kunjunganId)->first();
        $resepDetail = [];
        if ($resep) {
            $resepDetail = DB::table('resep_detail as rd')
                ->join('obat as o', 'o.id', '=', 'rd.obat_id')
                ->leftJoin('obat_satuan as s', 's.id', '=', 'o.satuan_id')
                ->select('rd.*', 'o.nama as obat_nama', 's.nama as satuan_nama')
                ->where('rd.resep_id', $resep->id)
                ->get();
        }

        // 5. Lab & Radiologi
        $lab = DB::table('lab_order_detail as lod')
            ->join('lab_order as lo', 'lo.id', '=', 'lod.lab_order_id')
            ->join('lab_pemeriksaan as lp', 'lp.id', '=', 'lod.pemeriksaan_id')
            ->select('lp.nama', 'lod.hasil', 'lod.nilai_rujukan', 'lod.qty')
            ->where('lo.kunjungan_id', $kunjunganId)
            ->get();

        $rad = DB::table('rad_order_detail as rod')
            ->join('rad_order as ro', 'ro.id', '=', 'rod.rad_order_id')
            ->join('rad_pemeriksaan as rp', 'rp.id', '=', 'rod.pemeriksaan_id')
            ->select('rp.nama', 'rod.hasil', 'rod.qty')
            ->where('ro.kunjungan_id', $kunjunganId)
            ->get();

        // 6. Riwayat Kunjungan Terdahulu Pasien (selain kunjungan sekarang)
        $riwayatTerdahulu = DB::table('kunjungan as k')
            ->leftJoin('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->leftJoin('rekam_medis as rm', 'rm.kunjungan_id', '=', 'k.id')
            ->select(
                'k.id as kunjungan_id',
                'k.no_kunjungan',
                'k.tgl_kunjungan',
                'k.status',
                'po.nama as poli_nama',
                'd.nama as dokter_nama',
                'rm.subjective',
                'rm.assessment',
                'rm.tekanan_darah',
                'rm.suhu'
            )
            ->where('k.pasien_id', $kj->pasien_id)
            ->where('k.id', '!=', $kunjunganId)
            ->orderBy('k.id', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'kunjungan' => $kj,
            'rekam_medis' => $rm,
            'diagnosa' => $diagnosa,
            'tindakan' => $tindakan,
            'lab' => $lab,
            'radiologi' => $rad,
            'resep' => $resep ? [
                'id' => $resep->id,
                'status' => $resep->status,
                'catatan' => $resep->catatan,
                'items' => $resepDetail,
            ] : null,
            'riwayat_terdahulu' => $riwayatTerdahulu,
        ]);
    }

    /**
     * Menyimpan data pemeriksaan medis, diagnosa, tindakan, dan E-Resep
     */
    public function simpanPeriksa(Request $request, int $kunjunganId): JsonResponse
    {
        $kj = DB::table('kunjungan')->where('id', $kunjunganId)->first();
        if (! $kj) {
            return response()->json(['success' => false, 'message' => 'Kunjungan tidak ditemukan.'], 404);
        }

        $validated = $request->validate([
            'aksi' => ['required', 'in:simpan,selesai'],
            'subjective' => ['nullable', 'string'],
            'objective' => ['nullable', 'string'],
            'assessment' => ['nullable', 'string'],
            'plan' => ['nullable', 'string'],
            'edukasi' => ['nullable', 'string'],
            'tekanan_darah' => ['nullable', 'string', 'max:15'],
            'suhu' => ['nullable', 'string', 'max:10'],
            'nadi' => ['nullable', 'string', 'max:10'],
            'berat_badan' => ['nullable', 'string', 'max:10'],
            'tinggi_badan' => ['nullable', 'string', 'max:10'],

            'diagnosa' => ['nullable', 'array'],
            'diagnosa.*.kode_icd10' => ['nullable', 'string', 'max:15'],
            'diagnosa.*.diagnosa' => ['required', 'string', 'max:200'],
            'diagnosa.*.jenis' => ['nullable', 'in:primer,sekunder'],

            'tindakan' => ['nullable', 'array'],
            'tindakan.*.tindakan_id' => ['required', 'integer', 'exists:tindakan,id'],
            'tindakan.*.qty' => ['required', 'integer', 'min:1'],

            'resep' => ['nullable', 'array'],
            'resep_catatan' => ['nullable', 'string', 'max:200'],
            'resep.*.obat_id' => ['required', 'integer', 'exists:obat,id'],
            'resep.*.qty' => ['required', 'integer', 'min:1'],
            'resep.*.dosis' => ['nullable', 'string', 'max:60'],
            'resep.*.aturan_pakai' => ['nullable', 'string', 'max:120'],
        ]);

        $userId = $request->user()?->id;

        try {
            DB::beginTransaction();

            // 1. Upsert rekam medis
            $existingRm = DB::table('rekam_medis')->where('kunjungan_id', $kunjunganId)->first();

            $rmData = [
                'dokter_id' => $kj->dokter_id,
                'subjective' => $validated['subjective'] ?? null,
                'objective' => $validated['objective'] ?? null,
                'assessment' => $validated['assessment'] ?? null,
                'plan' => $validated['plan'] ?? null,
                'edukasi' => $validated['edukasi'] ?? null,
                'tekanan_darah' => $validated['tekanan_darah'] ?? null,
                'suhu' => $validated['suhu'] ?? null,
                'nadi' => $validated['nadi'] ?? null,
                'berat_badan' => $validated['berat_badan'] ?? null,
                'tinggi_badan' => $validated['tinggi_badan'] ?? null,
            ];

            if ($existingRm) {
                DB::table('rekam_medis')->where('id', $existingRm->id)->update($rmData);
                $rmId = $existingRm->id;
            } else {
                $rmData['kunjungan_id'] = $kunjunganId;
                $rmData['created_at'] = now();
                $rmId = DB::table('rekam_medis')->insertGetId($rmData);
            }

            // 2. Simpan Diagnosa ICD-10
            DB::table('rm_diagnosa')->where('rekam_medis_id', $rmId)->delete();
            if (! empty($validated['diagnosa'])) {
                foreach ($validated['diagnosa'] as $diag) {
                    if (empty(trim($diag['diagnosa'] ?? ''))) {
                        continue;
                    }
                    DB::table('rm_diagnosa')->insert([
                        'rekam_medis_id' => $rmId,
                        'kode_icd10' => ! empty($diag['kode_icd10']) ? trim($diag['kode_icd10']) : null,
                        'diagnosa' => trim($diag['diagnosa']),
                        'jenis' => $diag['jenis'] ?? 'primer',
                    ]);
                }
            }

            // 3. Simpan Tindakan Medis
            DB::table('rm_tindakan')->where('rekam_medis_id', $rmId)->delete();
            if (! empty($validated['tindakan'])) {
                foreach ($validated['tindakan'] as $tind) {
                    $item = DB::table('tindakan')->where('id', $tind['tindakan_id'])->first();
                    if ($item) {
                        $qty = (int) $tind['qty'];
                        $hj = (float) ($item->harga_jual ?? 0);
                        $base = (float) ($item->tarif ?? 0);
                        $tarif = $hj > 0 ? $hj : round($base * 1.40, 2);

                        DB::table('rm_tindakan')->insert([
                            'rekam_medis_id' => $rmId,
                            'tgl_layanan' => $kj->tgl_kunjungan,
                            'tindakan_id' => $item->id,
                            'nama_tindakan' => $item->nama,
                            'qty' => $qty,
                            'tarif' => $tarif,
                            'subtotal' => $tarif * $qty,
                        ]);
                    }
                }
            }

            // 4. Simpan E-Resep Obat
            $jmlResep = 0;
            $oldResep = DB::table('resep')->where('kunjungan_id', $kunjunganId)->first();
            if ($oldResep) {
                DB::table('resep_detail')->where('resep_id', $oldResep->id)->delete();
                DB::table('resep')->where('id', $oldResep->id)->delete();
            }

            if (! empty($validated['resep'])) {
                $resepId = DB::table('resep')->insertGetId([
                    'kunjungan_id' => $kunjunganId,
                    'dokter_id' => $kj->dokter_id,
                    'status' => 'baru',
                    'catatan' => $validated['resep_catatan'] ?? null,
                    'tanggal' => now(),
                ]);

                foreach ($validated['resep'] as $r) {
                    $obat = DB::table('obat')->where('id', $r['obat_id'])->first();
                    if ($obat) {
                        $qty = (int) $r['qty'];
                        $hj = (float) ($obat->harga_jual ?? 0);
                        $base = (float) ($obat->harga_beli ?? 0);
                        $harga = $hj > 0 ? $hj : round($base * 1.40, 2);

                        DB::table('resep_detail')->insert([
                            'resep_id' => $resepId,
                            'tgl_layanan' => $kj->tgl_kunjungan,
                            'obat_id' => $obat->id,
                            'qty' => $qty,
                            'dosis' => $r['dosis'] ?? null,
                            'aturan_pakai' => $r['aturan_pakai'] ?? null,
                            'harga' => $harga,
                            'subtotal' => $harga * $qty,
                        ]);
                        $jmlResep++;
                    }
                }
            }

            // 5. Update status kunjungan
            $newStatus = 'periksa';
            if ($validated['aksi'] === 'selesai') {
                $newStatus = $jmlResep > 0 ? 'farmasi' : 'billing';
            }

            DB::table('kunjungan')->where('id', $kunjunganId)->update([
                'status' => $newStatus,
            ]);

            DB::commit();

            $msg = $validated['aksi'] === 'selesai'
                ? ($newStatus === 'farmasi'
                    ? 'Pemeriksaan selesai. Resep telah diteruskan ke modul Farmasi.'
                    : 'Pemeriksaan selesai. Data tagihan telah diteruskan ke Kasir/Billing.')
                : 'Data pemeriksaan berhasil disimpan sebagai draf.';

            return response()->json([
                'success' => true,
                'message' => $msg,
                'status' => $newStatus,
                'rekam_medis_id' => $rmId,
            ]);
        } catch (Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan pemeriksaan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mengambil riwayat Rekam Medis Elektronik (RME) lengkap untuk cetak / detail
     */
    public function detailRme(int $kunjunganId): JsonResponse
    {
        $kj = DB::table('kunjungan as k')
            ->join('pasien as p', 'p.id', '=', 'k.pasien_id')
            ->join('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->select(
                'k.*',
                'p.id as pasien_id',
                'p.no_mr',
                'p.nama as pasien_nama',
                'p.nik as pasien_nik',
                'p.jenis_kelamin as pasien_jk',
                'p.tgl_lahir as pasien_tgl_lahir',
                'p.alergi as pasien_alergi',
                'po.nama as poli_nama',
                'd.nama as dokter_nama'
            )
            ->where('k.id', $kunjunganId)
            ->first();

        if (! $kj) {
            return response()->json(['success' => false, 'message' => 'Rekam medis tidak ditemukan.'], 404);
        }

        $rm = DB::table('rekam_medis')->where('kunjungan_id', $kunjunganId)->first();
        $rmId = $rm?->id;

        $diagnosa = $rmId ? DB::table('rm_diagnosa')->where('rekam_medis_id', $rmId)->get() : [];
        $tindakan = $rmId ? DB::table('rm_tindakan')->where('rekam_medis_id', $rmId)->get() : [];

        $resep = DB::table('resep as r')
            ->join('resep_detail as rd', 'rd.resep_id', '=', 'r.id')
            ->join('obat as o', 'o.id', '=', 'rd.obat_id')
            ->select('rd.*', 'o.nama as obat_nama')
            ->where('r.kunjungan_id', $kunjunganId)
            ->get();

        return response()->json([
            'success' => true,
            'kunjungan' => $kj,
            'rekam_medis' => $rm,
            'diagnosa' => $diagnosa,
            'tindakan' => $tindakan,
            'resep' => $resep,
        ]);
    }
}
