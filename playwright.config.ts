import { defineConfig, devices } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],

  /**
   * Um worker fora de CI, e isto custou uma tarde pra descobrir.
   *
   * São dois projetos, desktop e mobile, e em paralelo cheio nesta máquina os
   * dois disputam CPU com o servidor Next do outro lado. O resultado engana:
   * metade dos testes estoura o timeout, sempre os de desktop, e parece bug de
   * aplicação. Não é. O mesmo teste que falha em paralelo passa em 3,5 s
   * sozinho, e a suíte inteira passa em 31 s com um worker. Em dev o quadro é
   * ainda pior, porque o Turbopack compila rota sob demanda e o `/api/lead`,
   * que puxa o engine inteiro, chegou a levar 156 s pra compilar.
   *
   * Em CI, onde a máquina é dedicada, o paralelismo volta.
   */
  workers: process.env.CI ? undefined : 1,

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
