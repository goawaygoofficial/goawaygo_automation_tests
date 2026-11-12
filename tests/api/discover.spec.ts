import { expect, test } from '@playwright/test';

import { fakesToken } from '../../lib/env';

// The AI and place services answer with fakes in test runs: without the token these tests would use free quota.
test.skip(!fakesToken, 'needs TEST_FAKES_TOKEN (fake outside services)');

test.describe('discover', () => {
  test('place suggestions while typing', async ({ request }) => {
    const response = await request.get('/api/discover/places', { params: { q: 'test' } });
    expect(response.status()).toBe(200);
    expect(response.headers()['x-goawaygo-test']).toBe('fakes');
    const places = await response.json();
    expect(places.length).toBeGreaterThan(0);
    expect(places[0]).toMatchObject({ name: expect.any(String), countryCode: expect.any(String) });
  });

  test('a destination page has its nine AI cards', async ({ request }) => {
    const places = await (await request.get('/api/discover/places', { params: { q: 'test' } })).json();
    const response = await request.get('/api/discover/destination', { params: { placeId: places[0].id } });
    expect(response.status()).toBe(200);
    const page = await response.json();
    expect(page.status).toBe('ok');
    expect(page.cards).toHaveLength(9);
    expect(page.place.name).toBe(places[0].name);
  });

  test('trip ideas are listed', async ({ request }) => {
    const response = await request.get('/api/discover/ideas', { params: { count: 4 } });
    expect(response.status()).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });
});
