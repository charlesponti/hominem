#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  . "$ROOT_DIR/.env"
  set +a
fi

export NODE_ENV="${NODE_ENV:-test}"
export DEV_DATABASE_URL="${DEV_DATABASE_URL:-postgres://postgres:postgres@localhost:5434/hominem}"
export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgres://postgres:postgres@localhost:4433/hominem-test}"
export DATABASE_URL="${DATABASE_URL:-$TEST_DATABASE_URL}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export AUTH_TEST_OTP_ENABLED="${AUTH_TEST_OTP_ENABLED:-true}"
export AUTH_E2E_SECRET="${AUTH_E2E_SECRET:-otp-secret}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-test-openrouter-key}"
export RESEND_API_KEY="${RESEND_API_KEY:-re_test_key}"
export RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-noreply@hominem.test}"
export RESEND_FROM_NAME="${RESEND_FROM_NAME:-Hominem Test}"
export SEND_EMAILS="${SEND_EMAILS:-false}"
export API_URL="${API_URL:-http://localhost:4040}"
export NOTES_URL="${NOTES_URL:-http://localhost:4445}"

exec "$@"
