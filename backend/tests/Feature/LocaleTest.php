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
}

