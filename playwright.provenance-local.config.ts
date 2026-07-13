import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const APP_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3200);
const ADAPTER_PORT = Number(process.env.PROVENANCE_ADAPTER_PORT ?? 8788);
const python = process.env.PROVENANCE_PYTHON ?? 'python3';
const adapterUrl = `http://127.0.0.1:${ADAPTER_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `${python} -m jingci_spike.http_service --port ${ADAPTER_PORT}`,
      cwd: path.join(process.cwd(), 'spikes/genblaze-provenance'),
      env: {
        ...process.env,
        PYTHONPATH: '.',
      },
      url: `${adapterUrl}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${APP_PORT}`,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: 'https://prompt-optimizer.hahazuo460.workers.dev/api/optimize',
        NEXT_PUBLIC_PROVENANCE_API_URL: adapterUrl,
      },
      url: `http://127.0.0.1:${APP_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
