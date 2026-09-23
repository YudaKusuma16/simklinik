<?php

namespace Tests\Feature;

use Tests\TestCase;

class LocaleTest extends TestCase
{
    public function test_can_switch_locale_via_web_get(): void
    {
        $response = $this->get('/locale/en');

        $response->assertStatus(302);
        $response->assertSessionHas('locale', 'en');
        $response->assertPlainCookie('locale', 'en');
    }

    public function test_can_switch_locale_via_api_post(): void
    {
        $response = $this->postJson('/api/locale/en');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'locale' => 'en',
        ]);
        $response->assertPlainCookie('locale', 'en');
    }

    public function test_rejects_unsupported_locale(): void
    {
        $response = $this->get('/locale/fr');

        $response->assertStatus(404);
    }

    public function test_legacy_login_renders_in_english_with_session(): void
    {
        $this->withoutExceptionHandling();
        $response = $this->withSession(['locale' => 'en'])->get('/legacy/auth/login.php');
        $response->assertStatus(200);
        $response->assertSee('<html lang="en">', false);
        $response->assertSee('Clinic Management Information System');
        $response->assertSee('Sign In');
    }

    public function test_legacy_dashboard_renders_in_english_with_cookie(): void
    {
        $this->withoutExceptionHandling();
        $user = \App\Models\User::first();
        $response = $this->actingAs($user)->withUnencryptedCookies(['locale' => 'en'])->get('/legacy/modules/dashboard/index.php');
        $response->assertStatus(200);
        $response->assertSee('<html lang="en">', false);
        $response->assertSee('Medical Records');
        $response->assertSee('Operations');
    }
}
