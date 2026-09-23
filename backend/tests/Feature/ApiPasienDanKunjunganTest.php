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

        // 6. Test cancellation when visit has billing and invoice (pembayaran status)
        $uniqueSuffix = rand(10000, 99999);
        $kunjunganId2 = DB::table('kunjungan')->insertGetId([
            'no_kunjungan' => 'KJ-TEST-INV-' . $uniqueSuffix,
            'pasien_id' => $pasienId,
            'poli_id' => $poli->id,
            'tgl_kunjungan' => $today,
            'status' => 'pembayaran',
            'created_at' => now(),
        ]);
        $billingId = DB::table('billing')->insertGetId([
            'kunjungan_id' => $kunjunganId2,
            'subtotal' => 100000,
            'total' => 100000,
            'status' => 'final',
        ]);
        DB::table('billing_detail')->insert([
            'billing_id' => $billingId,
            'kategori' => 'administrasi',
            'deskripsi' => 'Biaya Admin',
            'qty' => 1,
            'tarif' => 100000,
            'subtotal' => 100000,
        ]);
        $invoiceId = DB::table('invoice')->insertGetId([
            'no_invoice' => 'INV-TEST-' . $uniqueSuffix,
            'billing_id' => $billingId,
            'kunjungan_id' => $kunjunganId2,
            'tanggal' => $today,
            'total' => 100000,
            'terbayar' => 0,
            'status' => 'belum_bayar',
            'created_at' => now(),
        ]);

        $resBatalInvoice = $this->postJson("/api/kunjungan/{$kunjunganId2}/batal", [
            'kode_pembatalan_id' => $kodeBtl->id,
            'alasan_batal' => 'Batal setelah invoice dibuat',
        ]);
        $resBatalInvoice->assertStatus(200)->assertJson(['success' => true]);
        $this->assertEquals('batal', DB::table('kunjungan')->where('id', $kunjunganId2)->value('status'));

        // Clean up
        $kIds = DB::table('kunjungan')->where('pasien_id', $pasienId)->orWhere('no_kunjungan', 'like', 'KJ-TEST%')->pluck('id');
        if ($kIds->isNotEmpty()) {
            $invIds = DB::table('invoice')->whereIn('kunjungan_id', $kIds)->pluck('id');
            if ($invIds->isNotEmpty()) {
                DB::table('pembayaran')->whereIn('invoice_id', $invIds)->delete();
                DB::table('invoice')->whereIn('id', $invIds)->delete();
            }
            $bIds = DB::table('billing')->whereIn('kunjungan_id', $kIds)->pluck('id');
            if ($bIds->isNotEmpty()) {
                DB::table('billing_detail')->whereIn('billing_id', $bIds)->delete();
                DB::table('billing')->whereIn('id', $bIds)->delete();
            }
            DB::table('kunjungan')->whereIn('id', $kIds)->delete();
        }
        DB::table('pasien')->where('id', $pasienId)->delete();
    }

    public function test_rawat_inap_multi_date_services(): void
    {
        $this->authenticate();

        $pasienId = DB::table('pasien')->insertGetId([
            'no_mr' => 'GBKINAP' . rand(100, 999),
            'nama' => 'Pasien Rawat Inap Multi Date',
            'jenis_kelamin' => 'L',
            'created_at' => now(),
        ]);

        $poli = DB::table('poli')->first();
        $tindakan = DB::table('tindakan')->first();
        $lab = DB::table('lab_pemeriksaan')->first();
        $obat = DB::table('obat')->first();

        $today = date('Y-m-d');
        $tomorrow = date('Y-m-d', strtotime('+1 day'));

        $resKj = $this->postJson('/api/kunjungan', [
            'pasien_id' => $pasienId,
            'poli_id' => $poli->id,
            'jenis_registrasi' => 'rawat_inap',
            'tgl_kunjungan' => $today,
            'tgl_layanan' => $today,
            'jenis_penjamin' => 'umum',
            'keluhan_awal' => 'Rawat inap observasi',
            'status' => 'billing',
            'tindakan' => [
                ['tindakan_id' => $tindakan->id, 'qty' => 1, 'tgl_layanan' => $today],
                ['tindakan_id' => $tindakan->id, 'qty' => 2, 'tgl_layanan' => $tomorrow],
            ],
            'lab' => [
                ['lab_id' => $lab->id, 'qty' => 1, 'hasil' => 'Normal', 'tgl_layanan' => $today],
            ],
            'obat' => [
                ['obat_id' => $obat->id, 'qty' => 5, 'dosis' => '500mg', 'aturan_pakai' => '3x1', 'tgl_layanan' => $tomorrow],
            ],
        ]);

        $resKj->assertStatus(201)->assertJson(['success' => true]);
        $kunjunganId = $resKj->json('id');

        // Check billing items have distinct tgl_layanan
        $billingDetails = DB::table('billing_detail as bd')
            ->join('billing as b', 'b.id', '=', 'bd.billing_id')
            ->where('b.kunjungan_id', $kunjunganId)
            ->get();

        $this->assertNotEmpty($billingDetails);
        $dates = $billingDetails->pluck('tgl_layanan')->unique()->values()->all();
        $this->assertContains($today, $dates);
        $this->assertContains($tomorrow, $dates);

        // Clean up
        $billingId = DB::table('billing')->where('kunjungan_id', $kunjunganId)->value('id');
        if ($billingId) {
            DB::table('billing_detail')->where('billing_id', $billingId)->delete();
            DB::table('billing')->where('id', $billingId)->delete();
        }
        DB::table('rm_tindakan')->whereIn('rekam_medis_id', function ($q) use ($kunjunganId) {
            $q->select('id')->from('rekam_medis')->where('kunjungan_id', $kunjunganId);
        })->delete();
        DB::table('rekam_medis')->where('kunjungan_id', $kunjunganId)->delete();
        DB::table('lab_order_detail')->whereIn('lab_order_id', function ($q) use ($kunjunganId) {
            $q->select('id')->from('lab_order')->where('kunjungan_id', $kunjunganId);
        })->delete();
        DB::table('lab_order')->where('kunjungan_id', $kunjunganId)->delete();
        DB::table('resep_detail')->whereIn('resep_id', function ($q) use ($kunjunganId) {
            $q->select('id')->from('resep')->where('kunjungan_id', $kunjunganId);
        })->delete();
        DB::table('resep')->where('kunjungan_id', $kunjunganId)->delete();
        DB::table('kunjungan')->where('id', $kunjunganId)->delete();
        DB::table('pasien')->where('id', $pasienId)->delete();
    }
}
