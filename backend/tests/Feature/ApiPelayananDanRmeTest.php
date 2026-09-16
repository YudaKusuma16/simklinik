<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApiPelayananDanRmeTest extends TestCase
{
    protected function authenticate(): User
    {
        $user = User::where('username', 'admin')->first();
        $this->actingAs($user);

        return $user;
    }

    public function test_pelayanan_antrean_and_lookups(): void
    {
        $this->authenticate();

        $resAntrean = $this->getJson('/api/pelayanan/antrean');
        $resAntrean->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $resLookups = $this->getJson('/api/pelayanan/lookups');
        $resLookups->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'tindakan',
                'obat',
                'lab',
                'rad',
                'icd10',
            ]);
    }

    public function test_simpan_periksa_workflow_and_rme_detail(): void
    {
        $this->authenticate();

        // 1. Prepare test patient and visit
        $pasienId = DB::table('pasien')->insertGetId([
            'no_mr' => 'GBK-TEST-' . rand(1000, 9999),
            'nama' => 'Pasien Pelayanan RME Test',
            'jenis_kelamin' => 'L',
            'created_at' => now(),
        ]);

        $poli = DB::table('poli')->first();
        $dokter = DB::table('dokter')->first();
        $tindakan = DB::table('tindakan')->first();
        $obat = DB::table('obat')->first();

        $this->assertNotNull($poli);
        $this->assertNotNull($tindakan);
        $this->assertNotNull($obat);

        $kunjunganId = DB::table('kunjungan')->insertGetId([
            'no_kunjungan' => 'KJ-TEST-' . rand(1000, 9999),
            'pasien_id' => $pasienId,
            'poli_id' => $poli->id,
            'dokter_id' => $dokter?->id,
            'jenis_registrasi' => 'rawat_jalan',
            'tgl_kunjungan' => date('Y-m-d'),
            'no_antrian' => 1,
            'status' => 'menunggu',
            'created_at' => now(),
        ]);

        // 2. Load Periksa data
        $resShow = $this->getJson("/api/pelayanan/periksa/{$kunjunganId}");
        $resShow->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonPath('kunjungan.id', $kunjunganId);

        // 3. Simpan Draf Pemeriksaan (SOAP & Vital Signs)
        $resDraft = $this->postJson("/api/pelayanan/periksa/{$kunjunganId}", [
            'aksi' => 'simpan',
            'subjective' => 'Pasien mengeluh pusing dan demam 2 hari.',
            'objective' => 'Keadaan umum baik, compos mentis.',
            'assessment' => 'Observasi febris hari ke-2.',
            'plan' => 'Beri antipiretik dan edukasi istirahat.',
            'tekanan_darah' => '120/80',
            'suhu' => '38.2',
            'nadi' => '84',
            'berat_badan' => '65',
            'tinggi_badan' => '170',
            'diagnosa' => [
                ['kode_icd10' => 'R50.9', 'diagnosa' => 'Fever, unspecified (Demam)', 'jenis' => 'primer'],
            ],
            'tindakan' => [
                ['tindakan_id' => $tindakan->id, 'qty' => 1],
            ],
        ]);

        $resDraft->assertStatus(200)
            ->assertJson([
                'success' => true,
                'status' => 'periksa',
            ]);

        // 4. Selesaikan Pemeriksaan dengan E-Resep -> status should advance to 'farmasi'
        $resSelesai = $this->postJson("/api/pelayanan/periksa/{$kunjunganId}", [
            'aksi' => 'selesai',
            'subjective' => 'Pasien mengeluh pusing dan demam 2 hari.',
            'objective' => 'Keadaan umum baik, compos mentis.',
            'assessment' => 'Observasi febris hari ke-2.',
            'plan' => 'Beri antipiretik dan edukasi istirahat.',
            'tekanan_darah' => '120/80',
            'suhu' => '38.2',
            'nadi' => '84',
            'berat_badan' => '65',
            'tinggi_badan' => '170',
            'diagnosa' => [
                ['kode_icd10' => 'R50.9', 'diagnosa' => 'Fever, unspecified (Demam)', 'jenis' => 'primer'],
            ],
            'tindakan' => [
                ['tindakan_id' => $tindakan->id, 'qty' => 1],
            ],
            'resep' => [
                ['obat_id' => $obat->id, 'qty' => 10, 'dosis' => '500 mg', 'aturan_pakai' => '3 x 1 tablet sesudah makan'],
            ],
            'resep_catatan' => 'Habiskan obat jika demam masih berlanjut.',
        ]);

        $resSelesai->assertStatus(200)
            ->assertJson([
                'success' => true,
                'status' => 'farmasi',
            ]);

        // 5. Test detail RME endpoint
        $resRme = $this->getJson("/api/rekam-medis/{$kunjunganId}");
        $resRme->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonPath('kunjungan.id', $kunjunganId)
            ->assertJsonPath('rekam_medis.tekanan_darah', '120/80');

        $this->assertNotEmpty($resRme->json('diagnosa'));
        $this->assertNotEmpty($resRme->json('tindakan'));
        $this->assertNotEmpty($resRme->json('resep'));

        // Clean up
        $rmId = DB::table('rekam_medis')->where('kunjungan_id', $kunjunganId)->value('id');
        if ($rmId) {
            DB::table('rm_diagnosa')->where('rekam_medis_id', $rmId)->delete();
            DB::table('rm_tindakan')->where('rekam_medis_id', $rmId)->delete();
            DB::table('rekam_medis')->where('id', $rmId)->delete();
        }
        $resepId = DB::table('resep')->where('kunjungan_id', $kunjunganId)->value('id');
        if ($resepId) {
            DB::table('resep_detail')->where('resep_id', $resepId)->delete();
            DB::table('resep')->where('id', $resepId)->delete();
        }
        DB::table('kunjungan')->where('id', $kunjunganId)->delete();
        DB::table('pasien')->where('id', $pasienId)->delete();
    }
}
