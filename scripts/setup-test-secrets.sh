#!/usr/bin/env bash
# One-time setup by the owner (MVP 2, 5.5/5.6): the two values automated and performance test runs need, made at random
# and stored where they are used. Nothing is printed or written to disk.
#
#   TEST_FAKES_TOKEN     switches a test run's requests to the backend's fake outside services (backend:
#                        external/TestFakes). Secret Manager goawaygo-test-fakes-token in goawaygo-staging: dev and test
#                        read it, prod never has it.
#   AT_ACCOUNT_PASSWORD  the password of the test accounts in dev and test (lib/accounts.ts). Secret Manager
#                        goawaygo-at-account-password in goawaygo-staging (kept there only so local runs can use it).
#
# Both are also GitHub secrets of every repo that runs tests, with the same values.
#
#   Usage (Git Bash, from this folder):
#     gh auth switch -h github.com -u goawayofficial     # the owner account manages secrets
#     scripts/setup-test-secrets.sh
#     gh auth switch -h github.com -u goawaygo-bot        # back to the bot
#
# Safe to re-run: stored values are reused and set again in GitHub. ROTATE=1 (after a leak) makes a new token and a new
# password: the existing test accounts are switched to the new password first. Redeploy dev and test afterwards.
set -euo pipefail

PROJECT=goawaygo-staging
TOKEN_SECRET=goawaygo-test-fakes-token
PASSWORD_SECRET=goawaygo-at-account-password
RUNTIME_SA="goawaygo-backend@${PROJECT}.iam.gserviceaccount.com"
OWNER=goawaygoofficial
REPOS=(goawaygo_backend goawaygo_web_frontend goawaygo_app_frontend goawaygo_automation_tests goawaygo_performance_tests)

login="$(gh api user --jq .login)"
[ "$login" = "$OWNER" ] || {
  echo "gh is signed in as $login: run  gh auth switch -h github.com -u goawayofficial  first." >&2
  exit 1
}

# The stored value of a secret, byte-exact (gcloud adds "\r" on Windows: removed before decoding); empty if none.
stored() {
  gcloud secrets describe "$1" --project "$PROJECT" >/dev/null 2>&1 || return 0
  local data
  data="$(gcloud secrets versions access latest --secret "$1" --project "$PROJECT" --format 'get(payload.data)' \
    | tr -d '\r\n' | tr '_-' '/+')"
  while ((${#data} % 4)); do data+="="; done
  printf '%s' "$data" | base64 -d
}

store() { # name; value on stdin
  gcloud secrets describe "$1" --project "$PROJECT" >/dev/null 2>&1 \
    || gcloud secrets create "$1" --project "$PROJECT" --replication-policy automatic >/dev/null
  gcloud secrets versions add "$1" --project "$PROJECT" --data-file=- >/dev/null
}

old_token="$(stored "$TOKEN_SECRET")"
old_password="$(stored "$PASSWORD_SECRET")"

# ROTATE=1 (after a leak): first the test accounts get the new password, through the API and with the old token (the
# backend still accepts it); then the new values are stored everywhere. Redeploy dev and test afterwards (they read
# the token when they start).
if [ "${ROTATE:-0}" = 1 ] && [ -n "$old_password" ]; then
  new_password="Gg$(openssl rand -hex 16)!"
  for environment in dev test; do
    api="https://api-$environment.goawaygo.com"
    for suite in api web app pt; do
      email="delivered+goawaygo-${suite}-${environment}@resend.dev"
      session="$(printf '{"email":"%s","password":"%s"}' "$email" "$old_password" \
        | curl -s -X POST "$api/api/auth/signin" -H 'Content-Type: application/json' -H 'X-Client-Type: mobile' \
          -H "X-GoAwayGo-Test: $old_token" --data-binary @-)"
      access="$(printf '%s' "$session" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')"
      if [ -z "$access" ]; then
        echo "  $email: no such account (or not signed in), skipped"
        continue
      fi
      status="$(printf '{"password":"%s","newPassword":"%s"}' "$old_password" "$new_password" \
        | curl -s -o /dev/null -w '%{http_code}' -X POST "$api/api/auth/change-password" \
          -H 'Content-Type: application/json' -H 'X-Client-Type: mobile' -H "Authorization: Bearer $access" \
          -H "X-GoAwayGo-Test: $old_token" --data-binary @-)"
      [ "$status" = 200 ] || { echo "  $email: password change failed (HTTP $status); nothing stored" >&2; exit 1; }
      echo "  $email: new password"
    done
  done
  printf '%s' "$new_password" | store "$PASSWORD_SECRET"
  echo "Secret Manager: $PASSWORD_SECRET rotated"
  unset new_password session access
fi
unset old_password

token=""
[ "${ROTATE:-0}" = 1 ] || token="$old_token"
unset old_token
if [ -z "$token" ]; then
  token="$(openssl rand -hex 32)"
  printf '%s' "$token" | store "$TOKEN_SECRET"
  echo "Secret Manager: $TOKEN_SECRET made"
else
  echo "Secret Manager: $TOKEN_SECRET reused"
fi
gcloud secrets add-iam-policy-binding "$TOKEN_SECRET" --project "$PROJECT" \
  --member "serviceAccount:$RUNTIME_SA" --role roles/secretmanager.secretAccessor >/dev/null
echo "Secret Manager: dev and test (goawaygo-backend@$PROJECT) can read $TOKEN_SECRET"

password="$(stored "$PASSWORD_SECRET")"
if [ -z "$password" ]; then
  password="Gg$(openssl rand -hex 16)!"
  printf '%s' "$password" | store "$PASSWORD_SECRET"
  echo "Secret Manager: $PASSWORD_SECRET made"
else
  echo "Secret Manager: $PASSWORD_SECRET reused"
fi

for repo in "${REPOS[@]}"; do
  printf '%s' "$token" | gh secret set TEST_FAKES_TOKEN -R "$OWNER/$repo"
  printf '%s' "$password" | gh secret set AT_ACCOUNT_PASSWORD -R "$OWNER/$repo"
  echo "GitHub $repo: $(gh secret list -R "$OWNER/$repo" --json name --jq '[.[].name]|join(", ")')"
done
unset token password
echo "Done. Switch gh back to the bot: gh auth switch -h github.com -u goawaygo-bot"
