#!/usr/bin/env bash

load_test_env() {
  local root_dir="$1"

  if [ -f "$root_dir/.env" ]; then
    set -a
    . "$root_dir/.env"
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
}

database_url_without_query() {
  printf '%s' "${1%%\?*}"
}

database_url_query() {
  if [[ "$1" == *\?* ]]; then
    printf '?%s' "${1#*\?}"
  fi
}

database_url_base() {
  local raw_url
  raw_url="$(database_url_without_query "$1")"
  printf '%s' "${raw_url%/*}"
}

database_name_from_url() {
  local raw_url
  raw_url="$(database_url_without_query "$1")"
  printf '%s' "${raw_url##*/}"
}

database_admin_url() {
  printf '%s/postgres%s' "$(database_url_base "$1")" "$(database_url_query "$1")"
}

sanitize_database_name() {
  local value
  value="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_')"
  if [ -z "$value" ]; then
    value="hominem_test"
  fi
  if [[ "$value" =~ ^[0-9] ]]; then
    value="db_${value}"
  fi
  printf '%s' "$value"
}
