import { expect, type APIRequestContext } from '@playwright/test';

import { environment, readOnly } from './env';

/**
 * Test accounts in dev and test: one per suite, so parallel suites never share a session or a sign-in limit. They are
 * made on first use and kept. Their addresses are Resend's test inbox (`delivered+...@resend.dev`): the verification
 * email is accepted and dropped, nothing reaches a real person. Never used in prod.
 */
export type Suite = 'api' | 'web' | 'app' | 'pt';

export function accountEmail(suite: Suite): string {
  return `delivered+goawaygo-${suite}-${environment}@resend.dev`;
}

export function accountPassword(): string {
  const password = process.env.AT_ACCOUNT_PASSWORD ?? '';
  if (password.length < 8) {
    throw new Error('AT_ACCOUNT_PASSWORD is not set (GitHub secret; locally: see README.md)');
  }
  return password;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: { id: number; name: string; email: string };
}

const sessions = new Map<Suite, Promise<Session>>();

/**
 * The suite's test account, signed in once per test worker and then reused: sign-in is rate limited (10 per account
 * per 15 minutes), and an access token lasts 20 minutes, longer than a run.
 */
export function signIn(request: APIRequestContext, suite: Suite): Promise<Session> {
  let session = sessions.get(suite);
  if (!session) {
    session = freshSignIn(request, suite);
    sessions.set(suite, session);
    session.catch(() => sessions.delete(suite));
  }
  return session;
}

/** Signs in as the suite's test account (mobile style: the refresh token comes in the body), making it if needed. */
export async function freshSignIn(request: APIRequestContext, suite: Suite): Promise<Session> {
  if (readOnly) {
    throw new Error('No sign-in in prod: prod tests are read-only');
  }
  const email = accountEmail(suite);
  const password = accountPassword();
  const attempt = () =>
    request.post('/api/auth/signin', { headers: { 'X-Client-Type': 'mobile' }, data: { email, password } });
  let response = await attempt();
  if (response.status() === 401) {
    const signup = await request.post('/api/auth/signup', {
      data: { name: `GoAwayGo Test ${suite}`, email, password },
    });
    expect([201, 200, 409], `sign-up of ${email}: ${await signup.text()}`).toContain(signup.status());
    response = await attempt();
  }
  expect(response.status(), `sign-in of ${email}: ${await response.text()}`).toBe(200);
  return (await response.json()) as Session;
}

export function bearer(session: Session): Record<string, string> {
  return { Authorization: `Bearer ${session.accessToken}` };
}
