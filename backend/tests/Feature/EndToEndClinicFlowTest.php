<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EndToEndClinicFlowTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::first() ?? User::factory()->create();
    }

    /**
     * Test full clinic lifecycle:
     * 1. Register Patient (Pasien Baru)
     * 2. Register Visit (Kunjungan & Antrean Poli)
     * 3. Doctor Examination (SOAP, Vital Signs, ICD-10, Tindakan & E-Resep)
     * 4. Pharmacy Dispensing (Validasi stok, mutasi stok, serah obat -> status billing)
     * 5. Cashier Billing (Agregasi tagihan, invoice INV-YYYYMMDD-XXXX)
     * 6. Cashier Payment (Pembayaran valid -> invoice lunas, kunjungan selesai)
     * 7. Audit RME & Dashboard / Laporan update
     */
    public function test_complete_patient_journey_from_registration_to_payment(): void
    {
        // 1. Register Patient
        $nikTest = '3201' . rand(100000000000, 999999999999);
        $pasienRes = $this->actingAs($this->user)->postJson('/api/pasien', [
            'nama' => 'Pasien E2E Lifecycle Test',
            'nik' => $nikTest,
            'jenis_kelamin' => 'L',
            'tgl_lahir' => '1995-05-15',
            'telepon' => '08987654321',
            'alamat_domisili' => 'Jl. Pengujian Sistem No. 99',
            'alergi' => 'Amoxicillin',
        ]);

        $pasienRes->assertStatus(200)
            ->assertJson(['success' => true]);

        $pasienId = $pasienRes->json('id') ?? $pasienRes->json('data.id');
        $noMr = $pasienRes->json('no_mr') ?? $pasienRes->json('data.no_mr');
        $this->assertNotEmpty($pasienId);
        $this->assertNotEmpty($noMr);

        // 2. Register Visit (Poli Umum)
        $poli = DB::table('poli')->first();
        $this->assertNotNull($poli, 'Poli table must have at least one record.');

        $dokter = DB::table('dokter')->first();

        $kunjunganRes = $this->actingAs($this->user)->postJson('/api/kunjungan', [
            'pasien_id' => $pasienId,
            'poli_id' => $poli->id,
            'dokter_id' => $dokter ? $dokter->id : null,
            'tgl_kunjungan' => date('Y-m-d'),
            'jenis_penjamin' => 'umum',
            'keluhan_awal' => 'Demam tinggi dan sakit kepala sejak kemarin.',
        ]);

        $kunjunganRes->assertStatus(201)
            ->assertJson(['success' => true]);

        $kunjunganId = $kunjunganRes->json('id') ?? $kunjunganRes->json('data.id');
        $noKunjungan = $kunjunganRes->json('no_kunjungan') ?? $kunjunganRes->json('data.no_kunjungan');
        $this->assertNotEmpty($kunjunganId);

        // Verify status is 'menunggu'
        $this->assertDatabaseHas('kunjungan', [
            'id' => $kunjunganId,
            'status' => 'menunggu',
        ]);

        // 3. Doctor Examination (Pelayanan Medis & E-Resep)
        $tindakan = DB::table('tindakan')->first();
        $obat = DB::table('obat')->where('stok', '>=', 10)->first();

        $examPayload = [
            'aksi' => 'selesai',
            'tekanan_darah' => '120/80',
            'suhu' => '37.5',
            'nadi' => '84',
            'berat_badan' => '65.0',
            'tinggi_badan' => '170.0',
            'subjective' => 'Pasien mengeluh demam sejak 2 hari yang lalu disertai flu.',
            'objective' => 'Faring hiperemis (-), paru vesikuler (+/+).',
            'assessment' => 'Febris ec susp. Viral Infection (J06.9)',
            'plan' => 'Istirahat cukup, rehidrasi cairan, dan minum obat teratur.',
            'edukasi' => 'Bila demam berlanjut lebih dari 3 hari segera kontrol kembali.',
            'diagnosa' => [
                [
                    'kode_icd10' => 'J06.9',
                    'diagnosa' => 'Acute upper respiratory infection, unspecified',
                    'jenis' => 'primer',
                ],
            ],
            'tindakan' => $tindakan ? [
                [
                    'tindakan_id' => $tindakan->id,
                    'qty' => 1,
                    'biaya' => $tindakan->harga_jual ?? $tindakan->tarif ?? 35000,
                    'catatan' => 'Pemeriksaan fisik umum',
                ],
            ] : [],
            'resep' => $obat ? [
                [
                    'obat_id' => $obat->id,
                    'qty' => 5,
                    'dosis' => '500mg',
                    'aturan_pakai' => '3x1 tablet sesudah makan',
                    'catatan' => 'Bila demam',
                ],
            ] : [],
            'resep_catatan' => 'Minum obat sesudah makan.',
        ];

        $examRes = $this->actingAs($this->user)->postJson("/api/pelayanan/periksa/{$kunjunganId}", $examPayload);
        $examRes->assertStatus(200)->assertJson(['success' => true]);

        // If recipe was prescribed, status moves to 'farmasi'
        if ($obat) {
            $this->assertDatabaseHas('kunjungan', [
                'id' => $kunjunganId,
                'status' => 'farmasi',
            ]);

            // 4. Pharmacy Dispensing
            $resep = DB::table('resep')->where('kunjungan_id', $kunjunganId)->first();
            $this->assertNotNull($resep);

            $stokAwal = DB::table('obat')->where('id', $obat->id)->value('stok');

            $serahRes = $this->actingAs($this->user)->postJson("/api/farmasi/serah/{$resep->id}", [
                'petugas' => 'Apoteker Jaga',
                'catatan' => 'Obat telah diserahkan dan diedukasikan kepada pasien.',
            ]);

            $serahRes->assertStatus(200)->assertJson(['success' => true]);

            // Check stock deduction & mutation record
            $stokAkhir = DB::table('obat')->where('id', $obat->id)->value('stok');
            $this->assertEquals($stokAwal - 5, $stokAkhir);

            $this->assertDatabaseHas('stok_mutasi', [
                'obat_id' => $obat->id,
                'jenis' => 'keluar',
                'qty' => -5,
            ]);

            // Kunjungan status should now be 'billing'
            $this->assertDatabaseHas('kunjungan', [
                'id' => $kunjunganId,
                'status' => 'billing',
            ]);
        }

        // 5. Cashier Process & Save Billing
        $prosesRes = $this->actingAs($this->user)->getJson("/api/billing/proses/{$kunjunganId}");
        $prosesRes->assertStatus(200)->assertJson(['success' => true]);

        $simpanBillingRes = $this->actingAs($this->user)->postJson("/api/billing/simpan/{$kunjunganId}", [
            'aksi' => 'finalisasi',
            'diskon' => 0,
            'administrasi' => 10000,
        ]);

        $simpanBillingRes->assertStatus(200)->assertJson(['success' => true]);
        $invoiceId = $simpanBillingRes->json('invoice_id') ?? $simpanBillingRes->json('data.invoice_id');
        $totalTagihan = $simpanBillingRes->json('total') ?? $simpanBillingRes->json('data.total');

        $this->assertNotEmpty($invoiceId);

        // Kunjungan status is now 'pembayaran'
        $this->assertDatabaseHas('kunjungan', [
            'id' => $kunjunganId,
            'status' => 'pembayaran',
        ]);

        // 6. Cashier Payment (Tunai POS)
        $bayarRes = $this->actingAs($this->user)->postJson("/api/billing/bayar/{$kunjunganId}", [
            'metode' => 'cash',
            'jumlah' => $totalTagihan,
            'keterangan' => 'Pembayaran lunas tunai di kasir.',
        ]);

        $bayarRes->assertStatus(200)->assertJson([
            'success' => true,
            'invoice_status' => 'lunas',
        ]);

        // Check invoice is 'lunas' and kunjungan is 'selesai'
        $this->assertDatabaseHas('invoice', [
            'id' => $invoiceId,
            'status' => 'lunas',
        ]);

        $this->assertDatabaseHas('kunjungan', [
            'id' => $kunjunganId,
            'status' => 'selesai',
        ]);

        // 7. Verify EMR (RME) Completeness
        $rmeRes = $this->actingAs($this->user)->getJson("/api/rekam-medis/{$kunjunganId}");
        $rmeRes->assertStatus(200)->assertJson(['success' => true]);
        $this->assertEquals($noMr, $rmeRes->json('kunjungan.no_mr'));
        $this->assertEquals('120/80', $rmeRes->json('rekam_medis.tekanan_darah'));

        // 8. Verify Dashboard Stats & Reports
        $statsRes = $this->actingAs($this->user)->getJson('/api/dashboard/stats');
        $statsRes->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $statsRes->json('data.kpi.selesai_hari_ini'));

        $laporanRes = $this->actingAs($this->user)->getJson('/api/laporan/pendapatan?dari=' . date('Y-m-d') . '&sampai=' . date('Y-m-d'));
        $laporanRes->assertStatus(200);
        $this->assertGreaterThanOrEqual($totalTagihan, $laporanRes->json('data.total_pendapatan'));
    }
}
