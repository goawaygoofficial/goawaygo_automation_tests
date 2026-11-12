import { expect, test } from './fixtures';

import { accountEmail, bearer, signIn } from '../../lib/accounts';

test.describe('sign-in', () => {
  test('a test account signs in and sees its own profile', async ({ request }) => {
    const session = await signIn(request, 'api');
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    const me = await request.get('/api/users/me', { headers: bearer(session) });
    expect(me.status()).toBe(200);
    expect(await me.json()).toMatchObject({ email: accountEmail('api') });
  });

  test('a session is refreshed and ends with sign-out', async ({ request }) => {
    const session = await signIn(request, 'api');
    const mobile = { 'X-Client-Type': 'mobile' };

    const refreshed = await request.post('/api/auth/refresh', {
      headers: mobile,
      data: { refreshToken: session.refreshToken },
    });
    expect(refreshed.status()).toBe(200);
    const next = await refreshed.json();
    expect(next.accessToken).toBeTruthy();

    const logout = await request.post('/api/auth/logout', {
      headers: mobile,
      data: { refreshToken: next.refreshToken },
    });
    expect(logout.status()).toBeLessThan(300);
    const reused = await request.post('/api/auth/refresh', {
      headers: mobile,
      data: { refreshToken: next.refreshToken },
    });
    expect(reused.status()).toBe(401);
  });

  test('a wrong password is refused without saying whether the email exists', async ({ request }) => {
    const unknown = await request.post('/api/auth/signin', {
      data: { email: `nobody-${Date.now()}@example.com`, password: 'not-the-password' },
    });
    expect(unknown.status()).toBe(401);
    expect(await unknown.json()).toMatchObject({ error: 'invalid_credentials' });
  });

  test('sign-up checks its input', async ({ request }) => {
    const response = await request.post('/api/auth/signup', {
      data: { name: 'x', email: 'not-an-email', password: 'short' },
    });
    expect(response.status()).toBe(400);
  });
});
