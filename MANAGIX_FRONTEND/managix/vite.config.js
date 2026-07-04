import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    // Allow ngrok hostnames (URL changes each session on free tier)
    allowedHosts: true,
    // When using one ngrok tunnel on 5173, /api is proxied to the local Functions host.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7005',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
