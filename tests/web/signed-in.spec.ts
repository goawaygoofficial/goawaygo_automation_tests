import { type Page } from '@playwright/test';

import { accountEmail, accountPassword, freshSignIn } from '../../lib/accounts';
import { daysFromNow } from '../../lib/dates';
import { apiHeaders, apiUrl, fakesToken } from '../../lib/env';
import { expect, test } from './fixtures';

/**
 * One signed-in journey in a single page, step by step: sign-in is rate limited and the refresh token is rotated on
 * every use, so the steps share one session instead of signing in again.
 */
test.describe.configure({ mode: 'serial' });
test.skip(!fakesToken, 'needs TEST_FAKES_TOKEN (fake outside services) and the test account');

test.describe('signed-in journey', () => {
  let page: Page;

  test.beforeAll(async ({ browser, playwright }) => {
    // Makes the web test account on first use (through the API, like the website's own sign-up).
    const api = await playwright.request.newContext({ baseURL: apiUrl, extraHTTPHeaders: apiHeaders });
    await freshSignIn(api, 'web');
    await api.dispose();

    const context = await browser.newContext({ locale: 'en-GB' });
    page = await context.newPage();
    await page.addInitScript(() => {
      window.localStorage.setItem('goawaygo.analyticsConsent', 'denied');
      window.localStorage.setItem('goawaygo.language', 'en');
    });
    await page.route(`${apiUrl}/**`, (route) =>
      route.continue({ headers: { ...route.request().headers(), ...apiHeaders } }),
    );
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('sign in with email', async () => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'SIGN IN' }).click();
    const form = page.getByRole('form', { name: 'Sign in with email' });
    await form.getByLabel('Email address').fill(accountEmail('web'));
    await form.getByLabel('Password').fill(accountPassword());
    await form.getByRole('button', { name: 'SIGN IN' }).click();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByRole('link', { name: 'SIGN IN' })).toHaveCount(0);
  });

  test('plan a trip from a destination and see it in My Trips', async () => {
    // A plan starts from a place: search it, open its page, "Plan a trip here".
    await page.goto('/home');
    await page.getByPlaceholder('Where do you want to be?').fill('test');
    await page.getByRole('listbox', { name: 'Suggested places' }).getByRole('option').first().click();
    await expect(page).toHaveURL(/\/destination\//);
    await page
      .getByRole('link', { name: 'Plan a trip here' })
      .or(page.getByRole('button', { name: 'Plan a trip here' }))
      .click();

    await expect(page.getByRole('heading', { name: 'Plan a trip' })).toBeVisible();
    await page.getByLabel('Start date').fill(daysFromNow(40));
    await page.getByRole('button', { name: 'Plan my trip' }).click();

    await expect(page).toHaveURL(/\/plans\/[^/]+$/);
    await expect(page.getByText(/Test title/).first()).toBeVisible();

    await page.goto('/trips');
    await expect(page.getByText(/Test title/).first()).toBeVisible();
  });

  test('delete the plan again', async () => {
    await page.goto('/trips');
    await page
      .getByText(/Test title/)
      .first()
      .click();
    await expect(page).toHaveURL(/\/plans\/[^/]+$/);
    // Two taps: "Delete plan", then "Tap again to delete this plan".
    await page.getByRole('button', { name: 'Delete plan' }).click();
    await page.getByRole('button', { name: 'Tap again to delete this plan' }).click();
    await expect(page).toHaveURL(/\/trips/);
    await expect(page.getByText(/Test title/)).toHaveCount(0);
  });

  test('sign out', async () => {
    // Profile → User Profile holds "Sign Out"; it asks first, then opens the sign-in page.
    await page.goto('/profile/details');
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('button', { name: 'SIGN IN' })).toBeVisible();
  });
});
