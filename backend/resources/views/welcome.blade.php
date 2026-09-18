<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'SIM Klinik') }} — API Backend</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: #0f172a;
            color: #e2e8f0;
            font-family: ui-sans-serif, system-ui, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 48px;
            max-width: 520px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #0ea5e9;
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 4px 14px;
            border-radius: 100px;
            margin-bottom: 24px;
        }
        .badge::before {
            content: '';
            display: inline-block;
            width: 7px; height: 7px;
            border-radius: 50%;
            background: #bae6fd;
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        h1 {
            font-size: 28px;
            font-weight: 700;
            color: #f1f5f9;
            margin-bottom: 8px;
        }
        h1 span { color: #0ea5e9; }
        .subtitle {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 32px;
        }
        .divider {
            border: none;
            border-top: 1px solid #334155;
            margin: 24px 0;
        }
        .api-info {
            text-align: left;
            font-size: 13px;
        }
        .api-info h2 {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
            margin-bottom: 12px;
        }
        .api-route {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 8px;
            background: #0f172a;
            margin-bottom: 6px;
        }
        .method {
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 4px;
            min-width: 42px;
            text-align: center;
        }
        .get  { background:#166534; color:#bbf7d0; }
        .post { background:#92400e; color:#fde68a; }
        .route-path { font-family: ui-monospace, monospace; font-size: 12px; color: #cbd5e1; }
        .frontend-link {
            display: block;
            margin-top: 24px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #0ea5e9, #6366f1);
            color: #fff;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            transition: opacity 0.2s;
        }
        .frontend-link:hover { opacity: 0.85; }
    </style>
</head>
<body>
<div class="card">
    <div class="badge">API Server Running</div>
    <h1>SIM <span>Klinik</span></h1>
    <p class="subtitle">
        Backend Laravel API berjalan di <code style="color:#0ea5e9">{{ config('app.url') }}</code>.<br>
        Semua tampilan ada di Frontend React.
    </p>

    <hr class="divider">

    <div class="api-info">
        <h2>Available API Endpoints</h2>
        <div class="api-route">
            <span class="method post">POST</span>
            <span class="route-path">/api/auth/login</span>
        </div>
        <div class="api-route">
            <span class="method get">GET</span>
            <span class="route-path">/api/auth/me</span>
        </div>
        <div class="api-route">
            <span class="method get">GET</span>
            <span class="route-path">/api/dashboard/stats</span>
        </div>
        <div class="api-route">
            <span class="method get">GET</span>
            <span class="route-path">/api/pasien</span>
        </div>
        <div class="api-route">
            <span class="method get">GET</span>
            <span class="route-path">/api/kunjungan</span>
        </div>
        <div class="api-route">
            <span class="method get">GET</span>
            <span class="route-path">/api/up &nbsp;&nbsp;(health check)</span>
        </div>
    </div>

    <a class="frontend-link" href="http://localhost:5173/app/">
        → Buka Frontend (localhost:5173/app/)
    </a>
</div>
</body>
</html>
