/**
 * Where the tests run, from the environment variables the product repos' workflows set:
 *
 * - `GOAWAYGO_ENV`: `dev` (default), `test`, `prod` or `local`.
 * - `API_URL`, `WEB_URL`: override the addresses (e.g. prod's website before the launch).
 * - `TEST_FAKES_TOKEN`: makes the backend answer with fake outside services (AI, places, photos, flights), so test
 *   runs use no free quota. Sent only to our own API, never to other hosts. Not used in prod.
 * - `AT_ACCOUNT_PASSWORD`: the password of the test accounts in dev and test (lib/accounts.ts).
 *
 * In **prod** the tests are read-only: only those tagged `@smoke` run, nobody signs in and nothing is created.
 */
export type Environment = 'dev' | 'test' | 'prod' | 'local';

const ADDRESSES: Record<Environment, { api: string; web: string }> = {
  dev: { api: 'https://api-dev.goawaygo.com', web: 'https://dev.goawaygo.com' },
  test: { api: 'https://api-test.goawaygo.com', web: 'https://test.goawaygo.com' },
  prod: { api: 'https://api.goawaygo.com', web: 'https://goawaygo.com' },
  local: { api: 'http://localhost:8080', web: 'http://localhost:5173' },
};

function environmentFrom(value: string | undefined): Environment {
  const name = (value ?? 'dev').trim().toLowerCase();
  if (name in ADDRESSES) {
    return name as Environment;
  }
  throw new Error(`GOAWAYGO_ENV must be dev, test, prod or local, not "${value}"`);
}

function address(value: string | undefined, fallback: string): string {
  return (value?.trim() || fallback).replace(/\/+$/, '');
}

export const environment: Environment = environmentFrom(process.env.GOAWAYGO_ENV);
export const apiUrl = address(process.env.API_URL, ADDRESSES[environment].api);
export const webUrl = address(process.env.WEB_URL, ADDRESSES[environment].web);

/** Prod: only `@smoke` tests, no sign-in, nothing created. */
export const readOnly = environment === 'prod';

/** The header that switches a request to the fake outside services (backend: external/TestFakes). */
export const TEST_HEADER = 'X-GoAwayGo-Test';

export const fakesToken = readOnly ? '' : (process.env.TEST_FAKES_TOKEN ?? '').trim();

/** Headers for requests to our own API. */
export const apiHeaders: Record<string, string> = fakesToken ? { [TEST_HEADER]: fakesToken } : {};
