import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'playwright-report/results.json' }]],
  use: {
    baseURL: process.env.PW_BASE_URL || 'https://tms.umangcommunications.com',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    headless: true,
  },
});

