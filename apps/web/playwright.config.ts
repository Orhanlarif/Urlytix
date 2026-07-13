import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? '3001';
const apiPort = process.env.PLAYWRIGHT_API_PORT ?? '4001';
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: isCI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: process.env.WEB_BASE_URL ?? webBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter api start',
      cwd: '../..',
      url: `${apiBaseUrl}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: apiPort,
        CORS_ORIGINS: webBaseUrl,
        SHORT_URL_BASE: apiBaseUrl,
      },
    },
    {
      command: `pnpm --filter web start --port ${webPort} --hostname 127.0.0.1`,
      cwd: '../..',
      url: webBaseUrl,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: webPort,
      },
    },
  ],
});
