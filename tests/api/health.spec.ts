import { expect, test } from './fixtures';

test.describe('health @smoke', () => {
  test('the backend is up', async ({ request }) => {
    const response = await request.get('/actuator/health');
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'UP' });
  });

  test('a private endpoint needs a sign-in', async ({ request }) => {
    const response = await request.get('/api/users/me');
    expect(response.status()).toBe(401);
  });
});
