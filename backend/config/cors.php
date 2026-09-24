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

    'allowed_origins' => array_values(array_filter(array_unique(array_merge(
        [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:80',
            'http://localhost',
        ],
        array_map('trim', explode(',', env('FRONTEND_URL', '')))
    )))),

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
