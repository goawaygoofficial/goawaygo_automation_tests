import { expect, test } from './fixtures';

import { environment, webUrl } from '../../lib/env';

// The website the backend serves (prod: staging.goawaygo.com until the launch); defaults to this run's website.
const allowedOrigin = (process.env.ALLOWED_ORIGIN || webUrl).replace(/\/+$/, '');

test.describe('security @smoke', () => {
  test('the website may call the API (CORS)', async ({ request }) => {
    test.skip(environment === 'local', 'local CORS differs');
    const response = await request.fetch('/api/users/me', {
      method: 'OPTIONS',
      headers: { Origin: allowedOrigin, 'Access-Control-Request-Method': 'GET' },
    });
    expect(response.status()).toBeLessThan(300);
    expect(response.headers()['access-control-allow-origin']).toBe(allowedOrigin);
  });

  test('other websites may not', async ({ request }) => {
    const response = await request.fetch('/api/users/me', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' },
    });
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('every response carries a request id for support', async ({ request }) => {
    const response = await request.get('/api/users/me');
    expect(response.headers()['x-request-id']).toBeTruthy();
  });
});
