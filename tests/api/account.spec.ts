import { expect, test } from '@playwright/test';

import { bearer, signIn } from '../../lib/accounts';

test.describe('account, notifications and Wanderbook', () => {
  test('profile details and language are saved', async ({ request }) => {
    const auth = bearer(await signIn(request, 'api'));
    const name = `GoAwayGo Test api ${Date.now() % 1000}`;
    const saved = await request.put('/api/users/me', {
      headers: auth,
      data: { name, country: 'IN', currency: 'INR' },
    });
    expect(saved.status(), await saved.text()).toBe(200);
    expect((await (await request.get('/api/users/me', { headers: auth })).json()).name).toBe(name);

    const language = await request.put('/api/users/me/language', { headers: auth, data: { language: 'en' } });
    expect(language.status()).toBeLessThan(300);
  });

  test('the notification bell and its settings', async ({ request }) => {
    const auth = bearer(await signIn(request, 'api'));
    const page = await request.get('/api/notifications', { headers: auth });
    expect(page.status()).toBe(200);
    expect(await page.json()).toMatchObject({ items: expect.any(Array), unread: expect.any(Number) });

    const unread = await request.get('/api/notifications/unread', { headers: auth });
    expect(unread.status()).toBe(200);

    const settings = await request.get('/api/notifications/settings', { headers: auth });
    expect(settings.status()).toBe(200);
    const saved = await request.put('/api/notifications/settings', { headers: auth, data: await settings.json() });
    expect(saved.status()).toBeLessThan(300);
  });

  test('Wanderbook: own profile and the feed', async ({ request }) => {
    const auth = bearer(await signIn(request, 'api'));
    const me = await request.get('/api/wanderbook/me', { headers: auth });
    expect(me.status()).toBe(200);
    const feed = await request.get('/api/wanderbook/feed', { headers: auth });
    expect(feed.status()).toBe(200);
  });

  test('regions and currencies for the forms @smoke', async ({ request }) => {
    const response = await request.get('/api/regions');
    expect(response.status()).toBe(200);
  });
});
