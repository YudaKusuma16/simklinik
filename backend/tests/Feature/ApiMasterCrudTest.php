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
}

