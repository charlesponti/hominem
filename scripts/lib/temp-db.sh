#!/usr/bin/env bash

require_psql() {
  if ! command -v psql >/dev/null 2>&1; then
    printf '%s\n' 'psql is required but not installed' >&2
    exit 1
  fi
}

setup_temp_database() {
  local root_dir="$1"
  local suffix="$2"

  load_test_env "$root_dir"
  require_psql

  TEMP_DB_TEMPLATE_URL="$TEST_DATABASE_URL"
  TEMP_DB_TEMPLATE_NAME="$(database_name_from_url "$TEMP_DB_TEMPLATE_URL")"
  TEMP_DB_NAME="$(sanitize_database_name "${TEMP_DB_TEMPLATE_NAME}_${suffix}_$(date +%s)_$$_${RANDOM}")"
  TEMP_DB_URL="$(database_url_base "$TEMP_DB_TEMPLATE_URL")/${TEMP_DB_NAME}$(database_url_query "$TEMP_DB_TEMPLATE_URL")"
  TEMP_DB_ADMIN_URL="$(database_admin_url "$TEMP_DB_TEMPLATE_URL")"
}

cleanup_temp_database() {
  psql "$TEMP_DB_ADMIN_URL" -v ON_ERROR_STOP=1 <<SQL >/dev/null
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${TEMP_DB_NAME}'
  AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${TEMP_DB_NAME}";
SQL
}

create_temp_database() {
  psql "$TEMP_DB_ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${TEMP_DB_NAME}\" TEMPLATE template0" >/dev/null
}

migrate_temp_database() {
  local root_dir="$1"
  DATABASE_URL="$TEMP_DB_URL" GOOSE_MIGRATIONS_DIR="${GOOSE_MIGRATIONS_DIR:-$root_dir/packages/db/migrations_v1}" "$root_dir/scripts/run-goose.sh" up >/dev/null
}

seed_temp_database() {
  local seed_file="$1"
  psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -f "$seed_file" >/dev/null
}
