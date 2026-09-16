<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApiFarmasiDanBillingTest extends TestCase
{
    protected function authenticate(): User
    {
        $user = User::where('username', 'admin')->first();
        $this->actingAs($user);

        return $user;
    }

    public function test_farmasi_dispensing_and_billing_payment_lifecycle(): void
    {
        $this->authenticate();

        // 1. Prepare master data & test records
        $poli = DB::table('poli')->first();
        $dokter = DB::table('dokter')->first();
        $obat = DB::table('obat')->where('stok', '>', 10)->first();
        if (! $obat) {
            $obatId = DB::table('obat')->insertGetId([
                'kode' => 'OBT-TEST-' . rand(100, 999),
                'nama' => 'Paracetamol 500mg Test',
                'stok' => 50,
                'harga_beli' => 5000,
                'harga_jual' => 7000,
                'status' => 'aktif',
            ]);
            $obat = DB::table('obat')->where('id', $obatId)->first();
        }

        $stokAwal = (int) $obat->stok;

        $pasienId = DB::table('pasien')->insertGetId([
            'no_mr' => 'GBK-FAR-' . rand(1000, 9999),
            'nama' => 'Pasien Farmasi Billing Test',
            'jenis_kelamin' => 'P',
            'created_at' => now(),
        ]);

        $kunjunganId = DB::table('kunjungan')->insertGetId([
            'no_kunjungan' => 'KJ-FAR-' . rand(1000, 9999),
            'pasien_id' => $pasienId,
            'poli_id' => $poli->id,
            'dokter_id' => $dokter?->id,
            'jenis_registrasi' => 'rawat_jalan',
            'tgl_kunjungan' => date('Y-m-d'),
            'no_antrian' => 99,
            'status' => 'farmasi',
            'created_at' => now(),
        ]);

        $resepId = DB::table('resep')->insertGetId([
            'kunjungan_id' => $kunjunganId,
            'dokter_id' => $dokter?->id,
            'status' => 'baru',
            'catatan' => 'Sesudah makan',
            'tanggal' => now(),
        ]);

        DB::table('resep_detail')->insert([
            'resep_id' => $resepId,
            'tgl_layanan' => date('Y-m-d'),
            'obat_id' => $obat->id,
            'qty' => 5,
            'dosis' => '500 mg',
            'aturan_pakai' => '3x1',
            'harga' => $obat->harga_jual,
            'subtotal' => (float) $obat->harga_jual * 5,
        ]);

        // 2. Test Pharmacy Queue
        $resFarQueue = $this->getJson('/api/farmasi/antrean');
        $resFarQueue->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertTrue(collect($resFarQueue->json('data'))->contains('kunjungan_id', $kunjunganId));

        // 3. Test Pharmacy Recipe Detail
        $resFarDetail = $this->getJson("/api/farmasi/resep/{$resepId}");
        $resFarDetail->assertStatus(200)
            ->assertJson([
                'success' => true,
                'stok_cukup' => true,
            ]);

        // 4. Test Dispensing Medication
        $resSerah = $this->postJson("/api/farmasi/serah/{$resepId}");
        $resSerah->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify stock deducted and status changed to billing
        $stokAkhir = (int) DB::table('obat')->where('id', $obat->id)->value('stok');
        $this->assertEquals($stokAwal - 5, $stokAkhir);

        $statusKj = DB::table('kunjungan')->where('id', $kunjunganId)->value('status');
        $this->assertEquals('billing', $statusKj);

        // 5. Test Billing Calculation
        $resBillProses = $this->getJson("/api/billing/proses/{$kunjunganId}");
        $resBillProses->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertGreaterThan(0, $resBillProses->json('subtotal'));

        // 6. Test Billing Finalization & Invoice Generation
        $resBillSimpan = $this->postJson("/api/billing/simpan/{$kunjunganId}", [
            'aksi' => 'finalisasi',
            'diskon' => 0,
            'administrasi' => 10000,
        ]);
        $resBillSimpan->assertStatus(200)
            ->assertJson(['success' => true]);

        $statusKj2 = DB::table('kunjungan')->where('id', $kunjunganId)->value('status');
        $this->assertEquals('pembayaran', $statusKj2);

        $invoice = DB::table('invoice')->where('kunjungan_id', $kunjunganId)->first();
        $this->assertNotNull($invoice);
        $this->assertStringStartsWith('INV-', $invoice->no_invoice);

        // 7. Test Payment Processing
        $totalTagihan = (float) $invoice->total;
        $resBayar = $this->postJson("/api/billing/bayar/{$kunjunganId}", [
            'metode' => 'cash',
            'jumlah' => $totalTagihan,
            'keterangan' => 'Pembayaran lunas kasir',
        ]);
        $resBayar->assertStatus(200)
            ->assertJson([
                'success' => true,
                'invoice_status' => 'lunas',
            ]);

        // Verify visit is now 'selesai'
        $statusFinal = DB::table('kunjungan')->where('id', $kunjunganId)->value('status');
        $this->assertEquals('selesai', $statusFinal);

        // 8. Test Invoice View
        $resInvoice = $this->getJson("/api/billing/invoice/{$kunjunganId}");
        $resInvoice->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonPath('invoice.status', 'lunas');

        // Clean up
        DB::table('pembayaran')->where('invoice_id', $invoice->id)->delete();
        DB::table('invoice')->where('id', $invoice->id)->delete();
        $billingId = DB::table('billing')->where('kunjungan_id', $kunjunganId)->value('id');
        if ($billingId) {
            DB::table('billing_detail')->where('billing_id', $billingId)->delete();
            DB::table('billing')->where('id', $billingId)->delete();
        }
        DB::table('stok_mutasi')->where('ref_tabel', 'resep')->where('ref_id', $resepId)->delete();
        DB::table('resep_detail')->where('resep_id', $resepId)->delete();
        DB::table('resep')->where('id', $resepId)->delete();
        DB::table('kunjungan')->where('id', $kunjunganId)->delete();
        DB::table('pasien')->where('id', $pasienId)->delete();
        DB::table('obat')->where('id', $obat->id)->update(['stok' => $stokAwal]);
    }
}
