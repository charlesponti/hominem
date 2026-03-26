#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"

load_test_env "$ROOT_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  printf '%s\n' 'DATABASE_URL must be set' >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  printf '%s\n' 'psql is required but not installed' >&2
  exit 1
fi

database_name="$(database_name_from_url "$DATABASE_URL")"
admin_url="$(database_admin_url "$DATABASE_URL")"

psql "$admin_url" -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${database_name}'
  AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${database_name}";
CREATE DATABASE "${database_name}" TEMPLATE template0;
SQL
