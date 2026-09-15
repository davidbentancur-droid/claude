import { defineConfig, devices } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],

  use: {
    baseURL: BASE,
    locale: 'pt-BR',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],

  // Contra localhost sobe o servidor sozinho. Com E2E_BASE_URL apontando pra
  // Vercel, testa a URL publicada e não sobe nada.
  webServer: BASE.includes('localhost')
    ? { command: 'pnpm dev', url: BASE, reuseExistingServer: true, timeout: 120_000 }
    : undefined,
});
