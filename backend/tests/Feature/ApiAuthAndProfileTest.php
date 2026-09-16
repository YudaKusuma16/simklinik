<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ApiAuthAndProfileTest extends TestCase
{
    public function test_api_health_check_returns_ok(): void
    {
        $response = $this->getJson('/api/up');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
            ]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'nonexistent_user',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_login_and_fetch_me_succeeds(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'admin',
            'password' => 'admin123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'username' => 'admin',
                ],
            ]);

        $meResponse = $this->getJson('/api/auth/me');
        $meResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'username' => 'admin',
                ],
            ]);
    }

    public function test_profile_update_and_password_validation(): void
    {
        $user = User::where('username', 'admin')->first();
        $this->actingAs($user);

        // Update profile
        $updateResponse = $this->postJson('/api/profile', [
            'nama' => 'Administrator SIM Klinik',
            'username' => 'admin',
            'email' => 'admin@klinik.local',
            'telepon' => '08123456789',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'nama' => 'Administrator SIM Klinik',
                ],
            ]);

        // Change password validation error (wrong current password)
        $passResponse = $this->postJson('/api/profile/password', [
            'current_password' => 'passwordsalah',
            'new_password' => 'admin12345',
            'confirm_password' => 'admin12345',
        ]);

        $passResponse->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }
}
