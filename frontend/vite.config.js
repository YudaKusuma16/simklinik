import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  return {
    base: '/',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      watch: {
        usePolling: true,
      },
      proxy: {
        // Semua request /api diteruskan ke Laravel backend
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        // Proxy untuk asset publik (gambar, logo, dll)
        '/assets': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        // Proxy untuk locale switching
        '/locale': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        // Proxy untuk file upload/assets dari backend
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
