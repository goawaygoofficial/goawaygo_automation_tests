# GoAwayGo automation tests

Automated tests of GoAwayGo (MVP 2, 5.5): the **API** and the **website** with [Playwright](https://playwright.dev),
the **Android app** with [Maestro](https://maestro.mobile.dev) on an emulator. The product repos run them after every
deployment and record the result in the version's GitHub Release; a version moves up (dev → test → prod) only after
these tests and the performance tests passed in the environment below (**Releasing** (README) in any product repo).

| Folder       | What                                                                                                  | Run by                     |
| ------------ | ----------------------------------------------------------------------------------------------------- | -------------------------- |
| `tests/api/` | health, sign-in, discover, flights and partners, trip plans, profile, notifications, Wanderbook, CORS | backend `tests.yml`        |
| `tests/web/` | guest pages and searches, wrong sign-in, a signed-in journey (sign in → plan a trip → delete → out)   | website `tests.yml`        |
| `app/flows/` | the app starts, a guest finds a destination, sign-in and sign-out                                     | app `tests.yml` (emulator) |
| `lib/`       | environments, test accounts                                                                           |                            |

Tests tagged `@smoke` (Maestro: `smoke`) are the short run: pull requests into the product repos ("before" evidence)
and prod, where everything is read-only. Everything else runs after each deployment to dev and test.

## Documents in this repo

| File          | What it holds                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `README.md`   | Everything about this repo: features, how it works, setup, deployment, how we work, resources, roadmap, history |
| `LINKS.md`    | Every link for dev, test and prod, and the shared consoles                                                      |
| `RELEASES.md` | What each version brought and where it runs                                                                     |

These are the only Markdown files. Every change updates them in the same pull request (new feature, new service,
new setting, a release reaching prod).

## Contents

- [How a run works](#how-a-run-works)
- [Running locally](#running-locally)
- [Secrets](#secrets)
- [Changing the tests](#changing-the-tests)
- [How we work](#how-we-work)

## How a run works

- **Environments:** `GOAWAYGO_ENV=dev|test|prod|local` picks the addresses (`lib/env.ts`); `API_URL` / `WEB_URL`
  override them.
- **Fake outside services:** in dev and test every request to our API carries `X-GoAwayGo-Test: <TEST_FAKES_TOKEN>`.
  The backend then answers AI, places, photos, flights, partner links and moderation from memory (texts start with
  "Test", places are "Test City 1..3") and skips its rate limits, so runs use no free quota. The website tests add the
  header only to requests to our API, never to Google, Sentry or Cloudflare. prod never gets the token.
- **Test accounts:** one per suite and environment, `delivered+goawaygo-<suite>-<env>@resend.dev` (Resend's test inbox:
  emails are accepted and dropped), made on first use with `AT_ACCOUNT_PASSWORD`. Never in prod. Plans a test makes
  are deleted again.
- **Reports:** `reports/` (HTML, JSON, JUnit; traces, screenshots and videos of failures). The product repos keep them
  as run artifacts for 90 days.

## Running locally

```bash
npm ci
npx playwright install chromium
GOAWAYGO_ENV=dev npx playwright test --grep @smoke          # no secrets needed
```

The full suites need the two secrets in your shell (never in a file). The owner can read them from Secret Manager
without printing them:

```bash
# tr: on Windows gcloud ends its output with "\r"
sec() { gcloud secrets versions access latest --secret "$1" --project goawaygo-staging | tr -d '\r'; }
TEST_FAKES_TOKEN="$(sec goawaygo-test-fakes-token)" AT_ACCOUNT_PASSWORD="$(sec goawaygo-at-account-password)" \
  GOAWAYGO_ENV=dev npx playwright test
npm run report                                               # opens the HTML report
```

App flows need an emulator with a test build (the app repo's `tests.yml` shows how), then `app/run.sh`.

## Secrets

`scripts/setup-test-secrets.sh` (owner, once) makes `TEST_FAKES_TOKEN` and `AT_ACCOUNT_PASSWORD` and stores them in
Secret Manager (goawaygo-staging) and as GitHub secrets of the five repos that run tests. It never prints them.

## Changing the tests

Same path as every GoAwayGo repo: `feature/<name>` or `fix/<name>` → `develop` → `test` → `main` (the product repos' README → **How we work**).
Prefer what a user sees (roles, labels, texts) over CSS classes; keep each test independent and clean up what it
makes; tag a test `@smoke` only if it is read-only and needs no secrets.

## How we work

Same path as every GoAwayGo repo (MVP 2, 5.1): `feature/<name>` or `fix/<name>` → `develop` (squash, no approval) →
`test` → `main` (merge commits, the owner's approval). Any other branch name is rejected by GitHub, and the
`pre-push` hook says so locally: `git config core.hooksPath .githooks` once per clone.

Each environment runs the tests from its own branch: **dev** from `develop`, **test** from `test`, **prod** from
`main`. So a test change reaches test and prod only when it is promoted, like the product code.

Before a pull request: `npm ci`, `npm run check`, and run the changed tests against dev (README.md). Never commit a
password or token: they come from GitHub secrets (`TEST_FAKES_TOKEN`, `AT_ACCOUNT_PASSWORD`) at run time.

### Pull request description

Every pull request description follows this outline:

```markdown
## What

<!-- What does this PR change? Keep it short. -->

## Why

<!-- The problem it solves or the test it adds. -->

## Evidence

<!-- The CI run of this PR runs the changed tests against dev: link its report, or explain why not. -->

- [ ] Checks pass (`npm run check`)
- [ ] The changed tests pass against dev (CI report or local run)

## Checklist

- [ ] PR into `develop` from `feature/...` or `fix/...`
- [ ] Title follows Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)
- [ ] No secrets, passwords or tokens committed (they come from GitHub secrets at run time)
```
