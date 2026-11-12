#!/usr/bin/env bash
# Runs the app flows (Maestro) on a running Android emulator with the test build installed (MVP 2, 5.5). Called by the
# app repo's test workflow. prod: only flows tagged smoke, no sign-in.
#
#   Env: GOAWAYGO_ENV (dev|test|prod), API_URL, TEST_FAKES_TOKEN and AT_ACCOUNT_PASSWORD (not prod), OUT (reports)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ENVIRONMENT="${GOAWAYGO_ENV:?GOAWAYGO_ENV is required}"
OUT="${OUT:-reports}"
mkdir -p "$OUT"

args=(--format junit --output "$OUT/app-junit.xml" --test-output-dir "$OUT/app")
if [ "$ENVIRONMENT" = prod ]; then
  args+=(--include-tags smoke)
else
  email="delivered+goawaygo-app-${ENVIRONMENT}@resend.dev"
  "$HERE/../scripts/ensure-account.sh" app
  args+=(-e "EMAIL=$email" -e "PASSWORD=${AT_ACCOUNT_PASSWORD:?}")
fi
maestro test "${args[@]}" "$HERE/flows"
