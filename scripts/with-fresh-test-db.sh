#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"

load_test_env "$ROOT_DIR"

if ! command -v psql >/dev/null 2>&1; then
  printf '%s\n' 'psql is required but not installed' >&2
  exit 1
fi

template_url="$TEST_DATABASE_URL"
template_name="$(database_name_from_url "$template_url")"
database_name="$(sanitize_database_name "${template_name}_$(date +%s)_$$_${RANDOM}")"
database_url="$(database_url_base "$template_url")/${database_name}$(database_url_query "$template_url")"
admin_url="$(database_admin_url "$template_url")"

cleanup() {
  psql "$admin_url" -v ON_ERROR_STOP=1 <<SQL >/dev/null
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${database_name}'
  AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${database_name}";
SQL
}

trap cleanup EXIT

psql "$admin_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${database_name}\" TEMPLATE template0" >/dev/null
DATABASE_URL="$database_url" TEST_DATABASE_URL="$database_url" "$ROOT_DIR/scripts/run-goose.sh" up >/dev/null

if [ "$#" -eq 0 ]; then
  printf '%s\n' "$database_url"
  exit 0
fi

DATABASE_URL="$database_url" TEST_DATABASE_URL="$database_url" "$@"
