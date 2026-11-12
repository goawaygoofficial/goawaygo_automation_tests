import { defineConfig, devices } from '@playwright/test';

import { apiUrl, readOnly, webUrl } from './lib/env';

/**
 * Two projects: `api` (requests straight to the backend) and `web` (the website in Chrome). Reports go to `reports/`:
 * HTML for people, JSON and JUnit for the workflows that keep them as evidence.
 */
export default defineConfig({
  testDir: 'tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Few workers: dev and test run on one small Cloud Run instance each, and sign-in is rate limited.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  // Prod is read-only: only the @smoke tests run there.
  grep: readOnly ? /@smoke/ : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],
  use: {
    // No traces in CI: they record request headers and typed text (the test-run token, the test password), and the
    // reports are public run artifacts. Screenshots and videos of failures stay (password fields show dots).
    trace: process.env.CI ? 'off' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: 'tests/api',
      // The test-run header is added at run time (tests/api/fixtures.ts), never here: reports copy this configuration.
      use: { baseURL: apiUrl },
    },
    {
      name: 'web',
      testDir: 'tests/web',
      // The test header is added only to requests to our API (tests/web/fixtures.ts), never to other sites.
      use: { ...devices['Desktop Chrome'], baseURL: webUrl, locale: 'en-GB' },
    },
  ],
});
