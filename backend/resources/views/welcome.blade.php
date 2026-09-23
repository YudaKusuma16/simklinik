<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laravel Vite</title>
    <style>
        :root {
            --bg: #1a1a2e;
            --card-bg: rgba(255, 255, 255, 0.08);
            --text: #e0e0e0;
            --text-muted: #a0a0b0;
            --accent: #f43f5e;
            --accent-hover: #e11d48;
            --link: #f43f5e;
            --border: rgba(255, 255, 255, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .container {
            max-width: 580px;
            width: 100%;
        }

        .card {
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 3rem 2.5rem;
            text-align: center;
        }

        .logos {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .logos svg {
            width: 56px;
            height: 56px;
        }

        .plus {
            font-size: 1.5rem;
            color: var(--text-muted);
            font-weight: 300;
        }

        .card h2 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: var(--text);
        }

        .card p {
            font-size: 0.9rem;
            color: var(--text-muted);
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }

        .section-title {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--accent);
            margin-bottom: 0.35rem;
            text-align: left;
        }

        .section-desc {
            font-size: 0.85rem;
            color: var(--text-muted);
            line-height: 1.5;
            margin-bottom: 1.25rem;
            text-align: left;
        }

        .app-url {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 0.5rem;
            text-align: left;
        }

        .app-url code {
            color: var(--accent);
            text-decoration: none;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 0.85rem;
        }

        .app-url a {
            color: var(--accent);
            text-decoration: none;
        }

        .app-url a:hover {
            text-decoration: underline;
        }

        .vite-link {
            font-size: 0.85rem;
            margin-top: 1rem;
            text-align: left;
        }

        .vite-link a {
            color: var(--accent);
            text-decoration: none;
        }

        .vite-link a:hover {
            text-decoration: underline;
        }

        hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 1.5rem 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logos">
                <!-- Laravel Logo -->
                <svg viewBox="0 0 50 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M49.626 11.564a.809.809 0 01.028.209v10.972a.8.8 0 01-.402.694l-9.209 5.302V39.25c0 .286-.152.55-.4.694L20.42 51.01c-.044.025-.092.041-.14.058-.018.006-.035.017-.054.022a.805.805 0 01-.41 0c-.022-.006-.042-.018-.063-.026-.044-.016-.09-.03-.132-.054L.402 39.944A.801.801 0 010 39.25V6.334c0-.072.01-.142.028-.21.006-.023.02-.044.028-.067.015-.042.029-.085.051-.124.015-.026.037-.047.055-.071.023-.032.044-.065.071-.093.02-.02.047-.034.069-.052.027-.021.05-.046.08-.064h.001L10.02.092a.8.8 0 01.803 0l9.636 5.558h.002c.029.018.053.043.08.064.022.018.048.032.069.052.027.028.048.06.07.093.02.024.041.045.057.071.021.039.036.082.05.124.01.023.022.044.029.067a.82.82 0 01.027.21v20.559l8.008-4.611v-10.51c0-.07.01-.141.028-.208.007-.024.02-.045.028-.068.016-.042.03-.085.051-.124.016-.026.037-.047.056-.071.023-.032.044-.065.07-.093.02-.02.048-.034.07-.052.027-.021.05-.046.08-.064h0l9.636-5.558a.801.801 0 01.803 0l9.636 5.558c.03.018.054.043.08.064.023.018.049.032.07.052.027.028.048.06.07.093.02.024.042.045.057.071.021.039.036.082.051.124.008.023.022.044.028.068zM48.017 22.1V12.534l-3.363 1.938-4.646 2.674v9.566l8.01-4.612zM38.396 38.606V29.03l-4.57 2.61-12.85 7.344v9.652l17.42-10.03zM1.608 7.724v31.068L19.42 48.636v-9.654l-9.207-5.2-.003-.002-.004-.002c-.028-.017-.05-.04-.077-.06-.022-.02-.047-.035-.066-.054l-.001-.003c-.023-.025-.04-.056-.06-.084-.02-.027-.044-.05-.06-.079l-.001-.003c-.016-.03-.025-.066-.036-.1-.012-.03-.028-.06-.035-.093v-.001c-.01-.038-.012-.078-.016-.117-.003-.03-.012-.06-.012-.09v-.002-21.48L4.97 9.66 1.608 7.724zm8.813-6.08L2.412 6.334l8.009 4.612 8.009-4.612-8.01-4.613zm4.158 28.144l4.645-2.674V7.724l-3.363 1.937-4.646 2.675v19.39l3.364-1.937zM39.198 7.124l-8.01 4.612 8.01 4.613 8.009-4.613-8.01-4.612zm-.801 10.615l-4.645-2.674-3.364-1.938v9.567l4.646 2.674 3.363 1.937v-9.566zM20.02 38.33l11.743-6.704 5.668-3.241-8-4.606-9.21 5.303-8.2 4.724 8 4.524z" fill="#FF2D20"/>
                </svg>
                <span class="plus">+</span>
                <!-- Vite Logo -->
                <svg viewBox="0 0 410 404" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M399.641 59.525l-183.998 329.02c-3.799 6.793-13.559 6.91-17.51.21L8.346 59.553c-4.227-7.168 2.455-15.612 10.268-13.115l189.19 60.48a10 10 0 005.985-.036l181.607-60.406c7.785-2.59 14.476 5.818 10.245 13.049z" fill="url(#a)"/>
                    <path d="M292.965 1.474l-93.403 18.27a5 5 0 00-3.97 4.473L181.02 170.16c-.35 4.22 3.628 7.443 7.666 6.218l34.396-10.44c4.504-1.367 8.507 3.14 7.02 7.903L203.13 257.31c-1.568 5.015 3.96 9.038 8.271 6.023l27.104-18.953 71.85-139.985c2.19-4.267-2.782-8.744-6.584-5.927l-36.23 26.857c-3.904 2.894-8.993-.85-7.569-5.572l20.453-67.79c1.418-4.7-3.62-8.464-7.534-5.633z" fill="url(#b)"/>
                    <defs>
                        <linearGradient id="a" x1="6.938" y1="5.381" x2="235.783" y2="354.831" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#41D1FF"/>
                            <stop offset="1" stop-color="#BD34FE"/>
                        </linearGradient>
                        <linearGradient id="b" x1="194.651" y1="8.818" x2="236.076" y2="292.989" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#FFBD4F"/>
                            <stop offset="1" stop-color="#FF9640"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <h2>This is the Vite development server that provides Hot Module Replacement for your Laravel application.</h2>

            <p>To access your Laravel application, you will need to run a local development server.</p>

            <hr>

            <div class="section-title">Artisan Serve</div>
            <div class="section-desc">Laravel's local development server powered by PHP's built-in web server.</div>

            <div class="section-title">Laravel Sail</div>
            <div class="section-desc">A light-weight command-line interface for interacting with Laravel's default Docker development environment.</div>

            <hr>

            <div class="app-url">
                Your Laravel application's configured <code>APP_URL</code> is:<br>
                <a href="{{ config('app.url') }}">{{ config('app.url') }}</a>
            </div>

            <div class="vite-link">
                Want more information on Laravel's Vite integration?<br>
                <a href="https://laravel.com/docs/vite" target="_blank" rel="noopener">Read the documentation</a>
            </div>
        </div>
    </div>
</body>
</html>