#!/usr/bin/env bash
# Sourceable library for authenticating as a disposable test account against
# the dev Better Auth email-OTP flow (localhost:4040). Every feature-specific
# e2e driver (collection invites, and future ones) should `source` this
# instead of reimplementing OTP/cookie/safety-rail logic — auth setup is the
# same regardless of which resource the test is actually exercising.
#
# Usage from another driver.sh:
#   source ".../hominem-auth-e2e/lib.sh"
#   hominem_signup "invitee-e2e@test.hominem.dev"
#   curl -b "$(hominem_cookiejar_for "invitee-e2e@test.hominem.dev")" ...
#
# Not meant to be executed directly — see driver.sh in this directory for a
# standalone CLI over the same functions.

HOMINEM_API_URL="${HOMINEM_API_URL:-http://localhost:4040}"
HOMINEM_E2E_STATE_DIR="${HOMINEM_E2E_STATE_DIR:-/tmp/hominem-e2e}"
HOMINEM_TEST_EMAIL_SUFFIX="@test.hominem.dev"

# The default actor for any test that doesn't specifically need a second
# persona. Stable across sessions/runs (never torn down by cleanup or
# delete-user — see the guard in hominem_delete_user below), so a future
# Claude can default to this account instead of minting a fresh disposable
# one for every single-user test. Only spin up @test.hominem.dev accounts
# when a test genuinely needs more than one distinct identity (e.g. an
# owner + an invitee).
HOMINEM_STABLE_TEST_USER="test@hominem.local"

mkdir -p "$HOMINEM_E2E_STATE_DIR"

# Hard safety rail, shared by every driver that sources this file: never let
# a curl-driven script sign up, query, or delete a real account. A past
# session deleted real user data by trusting a row it hadn't verified it
# created — this check exists so that class of mistake can't happen via any
# of these scripts, in any skill, ever. Do not loosen it or route around it.
# The one stable test user is allowlisted by exact match (not a suffix, so
# it can't be widened by accident); every other test identity must be a
# disposable @test.hominem.dev account.
hominem_require_test_email() {
  case "$1" in
    "$HOMINEM_STABLE_TEST_USER") ;;
    *"$HOMINEM_TEST_EMAIL_SUFFIX") ;;
    *)
      echo "refusing: '$1' is neither the stable test user ($HOMINEM_STABLE_TEST_USER) nor a disposable account ending in $HOMINEM_TEST_EMAIL_SUFFIX. Use the browser for the real logged-in user." >&2
      exit 1
      ;;
  esac
}

hominem_cookiejar_for() {
  echo "$HOMINEM_E2E_STATE_DIR/$(echo "$1" | tr -c 'a-zA-Z0-9._-' '_').cookies"
}

# Mailbox file the scripted email provider appends captured OTPs to (JSONL).
# Same default as @hominem/utils/scripted-mailbox — keep the two in sync.
hominem_scripted_mailbox() {
  echo "${HOMINEM_SCRIPTED_MAILBOX:-$HOME/.hominem/scripted-mailbox.jsonl}"
}

# Latest captured OTP for an exact recipient address, or empty when nothing
# was captured yet. The send runs as a server background task, so callers
# poll this after requesting a code.
hominem_read_otp() {
  local email="$1"
  hominem_require_test_email "$email"
  local mailbox; mailbox="$(hominem_scripted_mailbox)"
  [ -f "$mailbox" ] || return 0
  jq -R -r --arg email "$email" \
    'fromjson? | select(.to == $email and (.otp | type) == "string") | "\(.capturedAt) \(.otp)"' \
    "$mailbox" 2>/dev/null | sort | tail -n 1 | awk '{print $2}'
}

# Sign up or sign in as a test email over curl. The OTP is the real randomly
# generated code: in local dev the server captures it to a same-host mailbox
# file instead of emailing it (set ENV=scripted to force capture), and this
# polls that file. OTPs are never served over HTTP — there is no endpoint that returns
# them, by design. Needs no inbox access and works identically for brand-new
# or existing accounts.
hominem_signup() {
  local email="$1"
  hominem_require_test_email "$email"
  local jar; jar="$(hominem_cookiejar_for "$email")"
  rm -f "$jar"

  curl -sS -o /dev/null -X POST "$HOMINEM_API_URL/api/auth/email-otp/send-verification-otp" \
    -H 'content-type: application/json' \
    -d "$(jq -nc --arg email "$email" '{email: $email, type: "sign-in"}')"

  # The send runs as a server background task, so the capture lands after the
  # send request already responded — poll the mailbox.
  local otp="" deadline=$(( $(date +%s) + 15 ))
  while [ -z "$otp" ] && [ "$(date +%s)" -lt "$deadline" ]; do
    otp="$(hominem_read_otp "$email")"
    [ -n "$otp" ] || sleep 0.5
  done
  if [ -z "$otp" ]; then
    echo "signup failed for $email: no OTP captured in $(hominem_scripted_mailbox) (is local email capture active? set ENV=scripted to force it)" >&2
    exit 1
  fi

  local resp
  resp="$(curl -sS -c "$jar" -X POST "$HOMINEM_API_URL/api/auth/sign-in/email-otp" \
    -H 'content-type: application/json' \
    -d "$(jq -nc --arg email "$email" --arg otp "$otp" '{email: $email, otp: $otp}')")"

  local user_id
  user_id="$(echo "$resp" | jq -r '.user.id // empty')"
  if [ -z "$user_id" ]; then
    echo "signup failed for $email: $resp" >&2
    exit 1
  fi
  echo "$user_id"
}

# Sign in as the stable default test user, creating it on first use. Prefer
# this over hominem_signup with a fresh disposable email whenever a test
# only needs one identity.
hominem_signin_default() {
  hominem_signup "$HOMINEM_STABLE_TEST_USER"
}

hominem_whoami() {
  local email="$1"
  hominem_require_test_email "$email"
  curl -sS -b "$(hominem_cookiejar_for "$email")" "$HOMINEM_API_URL/api/auth/get-session"
}

# Same-origin fetch-with-credentials, run inside the browser via
# javascript_tool. Documented here (not just in prose) because the obvious
# approach — clicking the account-menu "Sign out" item — has repeatedly
# failed to register clicks in the Claude_Browser pane for unknown reasons;
# this workaround has worked every time it's been tried.
hominem_print_browser_logout_snippet() {
  echo "fetch('$HOMINEM_API_URL/api/auth/logout', {method:'POST', credentials:'include'})"
}

hominem_db_url() {
  local repo_root env_file
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
  env_file="$repo_root/services/api/.env"
  [ -f "$env_file" ] || { echo "missing $env_file" >&2; exit 1; }
  grep '^DATABASE_URL=' "$env_file" | head -1 | cut -d= -f2- | tr -d '"'
}

# Deletes exactly the given test-account row (cascades to everything it
# owns) and its cookie jar. Callers are responsible for only ever passing
# emails they themselves created this session — this function's only job is
# refusing to run on anything outside the test domain. The stable default
# user is explicitly exempt: it's meant to persist across sessions, so
# "cleanup" for it means deleting the *data it created this run* (lists,
# etc — the feature-specific driver's job), never the account itself.
hominem_delete_user() {
  local email="$1"
  if [ "$email" = "$HOMINEM_STABLE_TEST_USER" ]; then
    echo "refusing: $HOMINEM_STABLE_TEST_USER is the stable default test user and is never deleted — clean up the data it created instead." >&2
    exit 1
  fi
  hominem_require_test_email "$email"
  # psql >= 18 does not interpolate -v variables inside -c strings (they are
  # only expanded in scripts read from stdin/-f), so pipe the DELETE in via a
  # heredoc instead. Capture output and fail loudly on error rather than
  # silently reporting success with the row still present.
  local out
  if ! out="$(psql "$(hominem_db_url)" -v ON_ERROR_STOP=1 -v email="$email" 2>&1 <<'SQL'
DELETE FROM "user" WHERE email = :'email';
SQL
)"; then
    echo "delete failed for $email:" >&2
    echo "$out" >&2
    exit 1
  fi
  rm -f "$(hominem_cookiejar_for "$email")"
}
