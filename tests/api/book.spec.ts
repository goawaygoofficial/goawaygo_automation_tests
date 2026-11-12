import { expect, test } from './fixtures';

import { daysFromNow } from '../../lib/dates';
import { fakesToken } from '../../lib/env';

test.skip(!fakesToken, 'needs TEST_FAKES_TOKEN (fake outside services)');

test.describe('book', () => {
  test('airport suggestions', async ({ request }) => {
    const response = await request.get('/api/book/airports', { params: { q: 'tes' } });
    expect(response.status()).toBe(200);
    const airports = await response.json();
    expect(airports.length).toBeGreaterThan(0);
    expect(airports[0]).toMatchObject({ code: expect.stringMatching(/^[A-Z]{3}$/) });
  });

  test('flight prices for a date, with partner links', async ({ request }) => {
    const response = await request.get('/api/book/flights', {
      params: { from: 'DEL', to: 'BOM', depart: daysFromNow(30), return: daysFromNow(37), currency: 'INR' },
    });
    expect(response.status(), await response.text()).toBe(200);
    const results = await response.json();
    expect(results.currency).toBe('INR');
    expect(results.onDate.length + results.nearby.length).toBeGreaterThan(0);
    expect(results.searchLink).toMatch(/^https:\/\//);
  });

  test('a flight search checks its input', async ({ request }) => {
    const same = await request.get('/api/book/flights', {
      params: { from: 'DEL', to: 'DEL', depart: daysFromNow(30) },
    });
    expect(same.status()).toBe(400);
  });

  test('stay and car rental partners', async ({ request }) => {
    const stays = await request.get('/api/book/stays', {
      params: { place: 'Goa', checkin: daysFromNow(30), checkout: daysFromNow(33) },
    });
    expect(stays.status(), await stays.text()).toBe(200);
    expect((await stays.json()).length).toBeGreaterThan(0);

    const cars = await request.get('/api/book/cars', {
      params: { place: 'Goa', pickup: daysFromNow(30), dropoff: daysFromNow(33) },
    });
    expect(cars.status(), await cars.text()).toBe(200);
    expect((await cars.json()).length).toBeGreaterThan(0);
  });
});
