import { defineConfig, devices } from '@playwright/test'
import { E2E_API_URL } from './e2e/config.ts'

// puerto propio para no chocar con un `pnpm dev` que esté corriendo
const PORT = 5174

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // pisa lo que haya en .env.local para que los tests no dependan del entorno de cada uno
    env: { VITE_API_URL: E2E_API_URL },
  },
})
