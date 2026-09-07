import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const LOCAL_URL = `http://localhost:${PORT}`;
const LIVE_URL = 'https://d16bfx0x2gpl4u.cloudfront.net';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 7000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || LOCAL_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'local',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: LOCAL_URL,
      },
    },
    {
      name: 'live',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: LIVE_URL,
      },
    },
  ],
  webServer: process.env.USE_LIVE
    ? undefined
    : {
        command: 'npm run dev -- --no-open',
        url: LOCAL_URL,
        reuseExistingServer: true,
        timeout: 30000,
      },
});
