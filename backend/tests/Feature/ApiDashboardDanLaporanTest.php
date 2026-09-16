<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ApiDashboardDanLaporanTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::first() ?? User::factory()->create();
    }

    public function test_can_fetch_dashboard_stats(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'tanggal',
                    'kpi' => [
                        'total_kunjungan',
                        'antrean_aktif',
                        'farmasi_menunggu',
                        'billing_menunggu',
                        'selesai_hari_ini',
                        'pendapatan_hari_ini',
                    ],
                    'obat_kritis',
                    'kunjungan_terbaru',
                    'per_poli',
                ],
            ]);
    }

    public function test_can_fetch_laporan_kunjungan(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/laporan/kunjungan?dari=2026-01-01&sampai=2026-12-31');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'dari',
                    'sampai',
                    'summary' => [
                        'total',
                        'menunggu',
                        'periksa',
                        'farmasi',
                        'billing',
                        'selesai',
                    ],
                    'rows',
                ],
            ]);
    }

    public function test_can_fetch_laporan_pendapatan(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/laporan/pendapatan?dari=2026-01-01&sampai=2026-12-31');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'dari',
                    'sampai',
                    'total_pendapatan',
                    'per_metode',
                    'rows',
                ],
            ]);
    }

    public function test_can_fetch_laporan_obat(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/laporan/obat?dari=2026-01-01&sampai=2026-12-31');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'dari',
                    'sampai',
                    'total_kuantitas',
                    'total_nominal',
                    'rows',
                ],
            ]);
    }

    public function test_can_fetch_laporan_piutang(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/laporan/piutang?dari=2026-01-01&sampai=2026-12-31');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'dari',
                    'sampai',
                    'total_piutang',
                    'total_tagihan',
                    'rows',
                ],
            ]);
    }
}
