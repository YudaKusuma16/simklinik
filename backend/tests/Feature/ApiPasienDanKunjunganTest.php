<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApiPasienDanKunjunganTest extends TestCase
{
    protected function authenticate(): User
    {
        $user = User::where('username', 'admin')->first();
        $this->actingAs($user);

        return $user;
    }

    public function test_pasien_crud_and_validation(): void
    {
        $this->authenticate();

        // 1. Create Pasien
        $nikTest = '317101' . rand(1000000000, 9999999999);
        $resCreate = $this->postJson('/api/pasien', [
            'nama' => 'Budi Santoso Unit Test',
            'nik' => $nikTest,
            'jenis_kelamin' => 'L',
            'tgl_lahir' => '1990-05-15',
            'tempat_lahir' => 'Jakarta',
            'alamat' => 'Jl. Pengujian No. 123',
            'telepon' => '081299998888',
            'gol_darah' => 'O+',
        ]);

        $resCreate->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $pasienId = $resCreate->json('id');
        $noMr = $resCreate->json('no_mr');

        $this->assertNotEmpty($noMr);
        $this->assertStringStartsWith('GBK', $noMr);

        // 2. Duplicate NIK validation
        $resDup = $this->postJson('/api/pasien', [
            'nama' => 'Pasien Kembar',
            'nik' => $nikTest,
            'jenis_kelamin' => 'L',
        ]);
        $resDup->assertStatus(422);

        // 3. Search Pasien
        $resSearch = $this->getJson('/api/pasien?q=Budi+Santoso');
        $resSearch->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
        $this->assertTrue(collect($resSearch->json('data'))->contains('id', $pasienId));

        // 4. Show Pasien
        $resShow = $this->getJson("/api/pasien/{$pasienId}");
        $resShow->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $pasienId,
                    'nama' => 'Budi Santoso Unit Test',
                ],
            ]);

        // 5. Update Pasien
        $resUpdate = $this->putJson("/api/pasien/{$pasienId}", [
            'nama' => 'Budi Santoso Updated',
            'nik' => $nikTest,
            'jenis_kelamin' => 'L',
            'telepon' => '081277776666',
        ]);
        $resUpdate->assertStatus(200)->assertJson(['success' => true]);

        // Clean up
        DB::table('pasien')->where('id', $pasienId)->delete();
    }

    public function test_kunjungan_queue_and_cancellation_flow(): void
    {
        $this->authenticate();

        // Prepare test patient & get first poli
        $pasienId = DB::table('pasien')->insertGetId([
            'no_mr' => 'GBKTEST' . rand(100, 999),
            'nama' => 'Pasien Kunjungan Test',
            'jenis_kelamin' => 'P',
            'created_at' => now(),
        ]);

        $poli = DB::table('poli')->first();
        $this->assertNotNull($poli);

        // 1. Lookups endpoint
        $resLookups = $this->getJson('/api/kunjungan/lookups');
        $resLookups->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'poli',
                'dokter',
                'asuransi',
                'kode_pembatalan',
            ]);

        // 2. Register Kunjungan
        $today = date('Y-m-d');
        $resKj = $this->postJson('/api/kunjungan', [
            'pasien_id' => $pasienId,
            'poli_id' => $poli->id,
            'jenis_registrasi' => 'rawat_jalan',
            'tgl_kunjungan' => $today,
            'jenis_penjamin' => 'umum',
            'keluhan_awal' => 'Demam dan batuk 3 hari',
        ]);

        $resKj->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $kunjunganId = $resKj->json('id');
        $noAntrian = $resKj->json('no_antrian');
        $this->assertGreaterThan(0, $noAntrian);

        // 3. Rekap antrean
        $resRekap = $this->getJson("/api/kunjungan/antrean-rekap?tgl={$today}");
        $resRekap->assertStatus(200)->assertJson(['success' => true]);

        // 4. Update status antrean -> 'periksa'
        $resStatus = $this->putJson("/api/kunjungan/{$kunjunganId}/status", [
            'status' => 'periksa',
        ]);
        $resStatus->assertStatus(200)->assertJson([
            'success' => true,
            'status' => 'periksa',
        ]);

        // 5. Cancel visit with code
        $kodeBtl = DB::table('kode_pembatalan')->where('status', 'aktif')->first();
        $resBatal = $this->postJson("/api/kunjungan/{$kunjunganId}/batal", [
            'kode_pembatalan_id' => $kodeBtl->id,
            'alasan_batal' => 'Pasien ada keperluan mendadak',
        ]);
        $resBatal->assertStatus(200)->assertJson(['success' => true]);

        // Verify status is batal
        $statusInDb = DB::table('kunjungan')->where('id', $kunjunganId)->value('status');
        $this->assertEquals('batal', $statusInDb);

        // Clean up
        DB::table('kunjungan')->where('id', $kunjunganId)->delete();
        DB::table('pasien')->where('id', $pasienId)->delete();
    }
}
