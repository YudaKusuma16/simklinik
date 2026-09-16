<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class PasienController extends Controller
{
    /**
     * Daftar pasien dengan pencarian NIK, No. MR, Nama, Telepon
     */
    public function index(Request $request): JsonResponse
    {
        $search = trim($request->query('q', ''));
        $query = DB::table('pasien as p')
            ->leftJoin('kelompok_pasien as kp', 'kp.id', '=', 'p.kelompok_id')
            ->select(
                'p.*',
                'kp.nama as kelompok_nama',
                DB::raw('(SELECT COUNT(*) FROM kunjungan WHERE kunjungan.pasien_id = p.id) as jml_kunjungan'),
                DB::raw('(SELECT MAX(tgl_kunjungan) FROM kunjungan WHERE kunjungan.pasien_id = p.id) as last_visit')
            );

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('p.nama', 'LIKE', "%{$search}%")
                  ->orWhere('p.no_mr', 'LIKE', "%{$search}%")
                  ->orWhere('p.nik', 'LIKE', "%{$search}%")
                  ->orWhere('p.telepon', 'LIKE', "%{$search}%");
            });
        }

        $pasien = $query->orderBy('p.id', 'desc')->limit(100)->get();

        return response()->json([
            'success' => true,
            'data' => $pasien,
            'total' => $pasien->count(),
        ]);
    }

    /**
     * Detail satu pasien beserta riwayat kunjungannya
     */
    public function show(int $id): JsonResponse
    {
        $pasien = DB::table('pasien as p')
            ->leftJoin('kelompok_pasien as kp', 'kp.id', '=', 'p.kelompok_id')
            ->select('p.*', 'kp.nama as kelompok_nama')
            ->where('p.id', $id)
            ->first();

        if (! $pasien) {
            return response()->json(['success' => false, 'message' => 'Pasien tidak ditemukan.'], 404);
        }

        $kunjungan = DB::table('kunjungan as k')
            ->leftJoin('poli as po', 'po.id', '=', 'k.poli_id')
            ->leftJoin('dokter as d', 'd.id', '=', 'k.dokter_id')
            ->select('k.*', 'po.nama as poli_nama', 'd.nama as dokter_nama')
            ->where('k.pasien_id', $id)
            ->orderBy('k.id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => (array) $pasien,
            'riwayat_kunjungan' => $kunjungan,
        ]);
    }

    /**
     * Mendaftarkan pasien baru & generate No. MR otomatis (GBK0001)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:120'],
            'nik' => ['nullable', 'string', 'max:20'],
            'no_passport' => ['nullable', 'string', 'max:40'],
            'tempat_lahir' => ['nullable', 'string', 'max:60'],
            'tgl_lahir' => ['nullable', 'date'],
            'jenis_kelamin' => ['required', 'in:L,P'],
            'gol_darah' => ['nullable', 'string', 'max:5'],
            'agama' => ['nullable', 'string', 'max:20'],
            'status_kawin' => ['nullable', 'string', 'max:20'],
            'pendidikan' => ['nullable', 'string', 'max:30'],
            'kewarganegaraan' => ['nullable', 'string', 'max:20'],
            'pekerjaan' => ['nullable', 'string', 'max:60'],
            'alamat' => ['nullable', 'string'],
            'kelurahan' => ['nullable', 'string', 'max:100'],
            'kecamatan' => ['nullable', 'string', 'max:100'],
            'kota' => ['nullable', 'string', 'max:100'],
            'provinsi' => ['nullable', 'string', 'max:100'],
            'kode_pos' => ['nullable', 'string', 'max:20'],
            'telepon' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'kelompok_id' => ['nullable', 'integer'],
            'no_asuransi' => ['nullable', 'string', 'max:40'],
            'kontak_nama' => ['nullable', 'string', 'max:120'],
            'kontak_hubungan' => ['nullable', 'string', 'max:40'],
            'kontak_telepon' => ['nullable', 'string', 'max:20'],
            'alergi' => ['nullable', 'string'],
            'riwayat_penyakit' => ['nullable', 'string'],
        ]);

        // Cek duplikasi NIK jika NIK diisi
        if (! empty($validated['nik'])) {
            $nikExists = DB::table('pasien')->where('nik', $validated['nik'])->exists();
            if ($nikExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'NIK sudah terdaftar pada pasien lain.',
                    'errors' => ['nik' => ['NIK sudah terdaftar.']],
                ], 422);
            }
        }

        // Generate No. MR: GBK0001
        $nextId = (int) DB::table('pasien')->max('id') + 1;
        $noMr = 'GBK' . str_pad((string) $nextId, 4, '0', STR_PAD_LEFT);

        $data = array_merge($validated, [
            'no_mr' => $noMr,
            'created_at' => now(),
        ]);

        $id = DB::table('pasien')->insertGetId($data);

        return response()->json([
            'success' => true,
            'message' => "Pasien berhasil didaftarkan dengan No. Rekam Medis {$noMr}",
            'id' => $id,
            'no_mr' => $noMr,
        ]);
    }

    /**
     * Memperbarui data identitas pasien
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $pasien = DB::table('pasien')->where('id', $id)->first();
        if (! $pasien) {
            return response()->json(['success' => false, 'message' => 'Pasien tidak ditemukan.'], 404);
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:120'],
            'nik' => ['nullable', 'string', 'max:20'],
            'no_passport' => ['nullable', 'string', 'max:40'],
            'tempat_lahir' => ['nullable', 'string', 'max:60'],
            'tgl_lahir' => ['nullable', 'date'],
            'jenis_kelamin' => ['required', 'in:L,P'],
            'gol_darah' => ['nullable', 'string', 'max:5'],
            'agama' => ['nullable', 'string', 'max:20'],
            'status_kawin' => ['nullable', 'string', 'max:20'],
            'pendidikan' => ['nullable', 'string', 'max:30'],
            'kewarganegaraan' => ['nullable', 'string', 'max:20'],
            'pekerjaan' => ['nullable', 'string', 'max:60'],
            'alamat' => ['nullable', 'string'],
            'kelurahan' => ['nullable', 'string', 'max:100'],
            'kecamatan' => ['nullable', 'string', 'max:100'],
            'kota' => ['nullable', 'string', 'max:100'],
            'provinsi' => ['nullable', 'string', 'max:100'],
            'kode_pos' => ['nullable', 'string', 'max:20'],
            'telepon' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'kelompok_id' => ['nullable', 'integer'],
            'no_asuransi' => ['nullable', 'string', 'max:40'],
            'kontak_nama' => ['nullable', 'string', 'max:120'],
            'kontak_hubungan' => ['nullable', 'string', 'max:40'],
            'kontak_telepon' => ['nullable', 'string', 'max:20'],
            'alergi' => ['nullable', 'string'],
            'riwayat_penyakit' => ['nullable', 'string'],
        ]);

        if (! empty($validated['nik'])) {
            $nikExists = DB::table('pasien')->where('nik', $validated['nik'])->where('id', '!=', $id)->exists();
            if ($nikExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'NIK sudah dipakai pasien lain.',
                    'errors' => ['nik' => ['NIK sudah dipakai pasien lain.']],
                ], 422);
            }
        }

        DB::table('pasien')->where('id', $id)->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data pasien berhasil diperbarui.',
        ]);
    }

    /**
     * Menghapus data pasien jika tidak memiliki transaksi/kunjungan
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            DB::table('pasien')->where('id', $id)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Data pasien berhasil dihapus.',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pasien tidak dapat dihapus karena memiliki riwayat kunjungan atau rekam medis.',
            ], 422);
        }
    }
}
