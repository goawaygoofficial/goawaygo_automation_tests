import { test as base, expect } from '@playwright/test';

import { apiHeaders, apiUrl } from '../../lib/env';

/**
 * The API tests' `request`, with the test-run header added here at run time. Never put it in playwright.config.ts:
 * reports (results.json) copy the configuration, and reports are public run artifacts.
 */
export const test = base.extend({
  request: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: apiUrl, extraHTTPHeaders: apiHeaders });
    await use(request);
    await request.dispose();
  },
});

export { expect };
