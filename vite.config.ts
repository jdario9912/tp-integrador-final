import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // prefijo '' para leer también variables sin VITE_ (no se exponen al cliente)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // el backend responde 401 al preflight OPTIONS sin cabeceras CORS;
      // con el proxy el navegador ve un único origen y no hay preflight
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          // el prefijo /api va en el target: json-server no lo usa, el backend sí
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      // los tests de e2e/ los corre Playwright
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
