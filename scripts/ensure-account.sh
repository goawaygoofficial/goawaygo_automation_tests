#!/usr/bin/env bash
# Makes sure a suite's test account exists in dev or test (lib/accounts.ts does the same for Playwright): signs in, and
# signs up first if needed. The password is sent on stdin, never as an argument.
#
#   Usage: scripts/ensure-account.sh <suite>      e.g. app
#   Env:   GOAWAYGO_ENV (dev|test), API_URL (optional), TEST_FAKES_TOKEN, AT_ACCOUNT_PASSWORD
set -euo pipefail

SUITE="${1:?suite (api, web, app or pt)}"
ENVIRONMENT="${GOAWAYGO_ENV:?GOAWAYGO_ENV is required}"
case "$ENVIRONMENT" in
  dev) default_api=https://api-dev.goawaygo.com ;;
  test) default_api=https://api-test.goawaygo.com ;;
  *) echo "Test accounts exist only in dev and test, not $ENVIRONMENT" >&2; exit 1 ;;
esac
API="${API_URL:-$default_api}"
EMAIL="delivered+goawaygo-${SUITE}-${ENVIRONMENT}@resend.dev"
: "${AT_ACCOUNT_PASSWORD:?AT_ACCOUNT_PASSWORD is required}"

post() { # path; JSON body on stdin -> HTTP status
  curl -s -o /dev/null -w '%{http_code}' -X POST "$API$1" -H 'Content-Type: application/json' \
    -H "X-GoAwayGo-Test: ${TEST_FAKES_TOKEN:-}" --data-binary @-
}
body() { # extra JSON fields
  printf '{"email":"%s","password":"%s"%s}' "$EMAIL" "$AT_ACCOUNT_PASSWORD" "$1"
}

status="$(body '' | post /api/auth/signin)"
if [ "$status" = 401 ]; then
  signup="$(body ",\"name\":\"GoAwayGo Test $SUITE\"" | post /api/auth/signup)"
  [ "$signup" = 201 ] || [ "$signup" = 409 ] || { echo "Sign-up of $EMAIL failed: HTTP $signup" >&2; exit 1; }
  status="$(body '' | post /api/auth/signin)"
fi
[ "$status" = 200 ] || { echo "Sign-in of $EMAIL failed: HTTP $status" >&2; exit 1; }
echo "Test account ready: $EMAIL"
