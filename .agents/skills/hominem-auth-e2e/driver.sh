#!/usr/bin/env bash
# Standalone CLI over lib.sh, for driving test-account auth directly rather
# than sourcing it from another skill's driver.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

case "${1:-}" in
  signup) shift; id="$(hominem_signup "$1")"; echo "signed up $1 -> userId=$id (cookiejar: $(hominem_cookiejar_for "$1"))" ;;
  signin-default) id="$(hominem_signin_default)"; echo "signed in $HOMINEM_STABLE_TEST_USER -> userId=$id (cookiejar: $(hominem_cookiejar_for "$HOMINEM_STABLE_TEST_USER"))" ;;
  whoami) shift; hominem_whoami "$1"; echo ;;
  cookiejar) shift; hominem_cookiejar_for "$1" ;;
  logout-snippet) hominem_print_browser_logout_snippet ;;
  delete-user) shift; hominem_delete_user "$1" ;;
  *)
    cat >&2 <<EOF
usage: driver.sh <command> [args]

  signin-default          sign in as the stable default test user ($HOMINEM_STABLE_TEST_USER), creating it if needed
  signup <email>          OTP sign-up/sign-in as a disposable @test.hominem.dev email (dev OTP is always 000000)
  whoami <email>          print the Better Auth session for email
  cookiejar <email>       print the cookie jar path for email (for use with curl -b)
  logout-snippet          print the JS to run via javascript_tool to log the browser out
  delete-user <email>     delete a disposable test account and its cookie jar (refuses the stable default user)

Default to signin-default unless a test genuinely needs a second distinct
identity (e.g. an owner + an invitee) — only then mint a disposable
@test.hominem.dev account with signup.

Feature-specific test skills should \`source lib.sh\` instead of shelling
out to this CLI, to avoid a subprocess per call.
EOF
    exit 1
    ;;
esac
