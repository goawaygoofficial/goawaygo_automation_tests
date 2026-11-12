import { fakesToken } from '../../lib/env';
import { expect, test } from './fixtures';

test.describe('guest @smoke', () => {
  test('the home page loads with the destination search', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveTitle(/GoAwayGo/);
    await expect(page.getByPlaceholder('Where do you want to be?')).toBeVisible();
  });

  test('the sign-in page offers Google and email', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('button', { name: 'SIGN IN' })).toBeVisible();
    await page.getByRole('button', { name: 'SIGN IN' }).click();
    await expect(page.getByRole('form', { name: 'Sign in with email' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
  });

  test('the legal pages are public', async ({ page }) => {
    for (const [path, heading] of [
      ['/privacy', /Privacy/i],
      ['/terms', /Terms/i],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    }
  });
});

test.describe('guest journeys', () => {
  test.skip(!fakesToken, 'needs TEST_FAKES_TOKEN (fake outside services)');

  test('search a place and open its destination page', async ({ page }) => {
    await page.goto('/home');
    await page.getByPlaceholder('Where do you want to be?').fill('test');
    const suggestions = page.getByRole('listbox', { name: 'Suggested places' });
    await expect(suggestions.getByRole('option').first()).toBeVisible();
    await suggestions.getByRole('option').first().click();

    await expect(page).toHaveURL(/\/destination\//);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Test City');
    // The AI cards are collapsed: open the first one (fake answers start with "Test").
    await page.getByRole('button', { name: /Quick Facts/ }).click();
    await expect(page.getByText(/^Test (label|detail)/).first()).toBeVisible();
  });

  test('wrong sign-in details show an error', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'SIGN IN' }).click();
    const form = page.getByRole('form', { name: 'Sign in with email' });
    await form.getByLabel('Email address').fill(`nobody-${Date.now()}@example.com`);
    await form.getByLabel('Password').fill('not-the-password');
    await form.getByRole('button', { name: 'SIGN IN' }).click();
    await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  });
});
