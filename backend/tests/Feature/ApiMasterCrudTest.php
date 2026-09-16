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
}
