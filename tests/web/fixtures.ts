import { test as base, expect } from '@playwright/test';

import { apiUrl, fakesToken, TEST_HEADER, webHeaders, webUrl } from '../../lib/env';

/**
 * Every website test starts like a returning visitor who already answered the analytics question ("No thanks") and
 * reads English. In dev and test, requests to our API carry the test header, so the backend uses its fake outside
 * services; no other site (Google, Sentry, Cloudflare) ever sees the token. The dev and test websites are team-only
 * (Cloudflare Access): requests to our website carry the Access service token, and only those.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('goawaygo.analyticsConsent', 'denied');
      window.localStorage.setItem('goawaygo.language', 'en');
    });
    if (Object.keys(webHeaders).length > 0) {
      await page.route(`${webUrl}/**`, (route) =>
        route.continue({ headers: { ...route.request().headers(), ...webHeaders } }),
      );
    }
    if (fakesToken) {
      await page.route(`${apiUrl}/**`, (route) =>
        route.continue({ headers: { ...route.request().headers(), [TEST_HEADER]: fakesToken } }),
      );
    }
    await use(page);
  },
});

export { expect };
