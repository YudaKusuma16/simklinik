<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class ApiMasterCrudTest extends TestCase
{
    public function test_get_master_entities_returns_list(): void
    {
        $user = User::where('username', 'admin')->first();
        $this->actingAs($user);

        $response = $this->getJson('/api/master/entities');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'poli',
                    'dokter',
                    'obat',
                    'tindakan',
                ],
            ]);
    }

    public function test_get_poli_list_and_crud_lifecycle(): void
    {
        $user = User::where('username', 'admin')->first();
        $this->actingAs($user);

        // 1. Create Poli
        $createRes = $this->postJson('/api/master/poli', [
            'kode' => 'POLI_AUTO',
            'nama' => 'Poli Otomatis Test',
            'status' => 'aktif',
        ]);

        $createRes->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $id = $createRes->json('id');

        // 2. Read single Poli
        $showRes = $this->getJson("/api/master/poli/{$id}");
        $showRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'nama' => 'Poli Otomatis Test',
                ],
            ]);

        // 3. Update Poli
        $updateRes = $this->putJson("/api/master/poli/{$id}", [
            'nama' => 'Poli Otomatis Updated',
            'status' => 'aktif',
        ]);

        $updateRes->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        // 4. Delete Poli
        $deleteRes = $this->deleteJson("/api/master/poli/{$id}");
        $deleteRes->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    public function test_master_entities_caching_and_invalidation(): void
    {
        $user = User::where('username', 'admin')->first();
        $this->actingAs($user);

        \Illuminate\Support\Facades\Cache::forget('master_entities_counts');
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has('master_entities_counts'));

        // Fetching entities should populate cache
        $this->getJson('/api/master/entities')->assertStatus(200);
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has('master_entities_counts'));

        // Creating an entity should invalidate cache
        $res = $this->postJson('/api/master/poli', [
            'kode' => 'CACHE_TEST',
            'nama' => 'Poli Cache Test',
            'status' => 'aktif',
        ]);
        $res->assertStatus(200);
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has('master_entities_counts'));

        $id = $res->json('id');

        // Populate cache again
        $this->getJson('/api/master/entities')->assertStatus(200);
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has('master_entities_counts'));

        // Updating entity should invalidate cache
        $this->putJson("/api/master/poli/{$id}", ['nama' => 'Poli Cache Updated'])->assertStatus(200);
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has('master_entities_counts'));

        // Populate cache again
        $this->getJson('/api/master/entities')->assertStatus(200);
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has('master_entities_counts'));

        // Deleting entity should invalidate cache
        $this->deleteJson("/api/master/poli/{$id}")->assertStatus(200);
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has('master_entities_counts'));
    }

    public function test_kode_pembatalan_reg_creates_with_correct_prefix_and_filtering(): void
    {
        $user = User::where('username', 'admin')->first();
        $this->actingAs($user);

        // 1. Create Kode Pembatalan Registrasi without providing manual kode
        $createRes = $this->postJson('/api/master/kode_pembatalan_reg', [
            'nama' => 'Pasien Berubah Pikiran',
            'keterangan' => 'Registrasi dibatalkan sendiri oleh pasien',
            'status' => 'aktif',
        ]);

        $createRes->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $id = $createRes->json('id');

        // Check the newly created row in database
        $row = \Illuminate\Support\Facades\DB::table('kode_pembatalan')->where('id', $id)->first();
        $this->assertNotNull($row);
        $this->assertStringStartsWith('BTL-REG', $row->kode);

        // 2. Fetch list for kode_pembatalan_reg -> should include this row
        $listReg = $this->getJson('/api/master/kode_pembatalan_reg')->assertStatus(200)->json('data');
        $this->assertTrue(collect($listReg)->pluck('id')->contains($id));

        // 3. Fetch list for kode_pembatalan (billing) -> should NOT include this row
        $listBilling = $this->getJson('/api/master/kode_pembatalan')->assertStatus(200)->json('data');
        $this->assertFalse(collect($listBilling)->pluck('id')->contains($id));

        // Clean up
        $this->deleteJson("/api/master/kode_pembatalan_reg/{$id}")->assertStatus(200);
    }
}


