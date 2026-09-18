<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Konfigurasi ini mengizinkan frontend React (localhost:5173) untuk
    | berkomunikasi dengan backend Laravel (localhost:8000) menggunakan
    | session cookie (credentials: 'include').
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:5173'),
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
     * supports_credentials HARUS true agar session cookie dikirim
     * dari frontend (credentials: 'include')
     */
    'supports_credentials' => true,

];
