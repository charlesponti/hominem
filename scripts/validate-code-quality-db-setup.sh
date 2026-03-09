#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel)
SCHEMA_PATH=${CI_DB_SCHEMA_PATH:-"packages/db"}
DB_PORT=55433
DB_CONTAINER="hominem-code-quality-db-setup"
DB_URL="postgres://postgres:postgres@localhost:${DB_PORT}/hominem-test?sslmode=disable"
IMAGE="ghcr.io/charlesponti/hominem/pontistudios-postgres:latest"
TMP_SCHEMA_FILE=""
DRY_OUTPUT=""
ATLAS_BIN="${HOME}/.local/bin/atlas"

cleanup() {
  if [ -n "${DRY_OUTPUT}" ] && [ -f "$DRY_OUTPUT" ]; then
    rm -f "$DRY_OUTPUT"
  fi

  if [ -n "$TMP_SCHEMA_FILE" ] && [ -f "$TMP_SCHEMA_FILE" ]; then
    rm -f "$TMP_SCHEMA_FILE"
  fi

  if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    docker stop "$DB_CONTAINER" >/dev/null 2>&1 || true
    docker rm "$DB_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

check_dependency() {
  local name=$1
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing dependency: $name"
    exit 1
  fi
}

check_dependency docker
check_dependency curl

if [ ! -x "$ATLAS_BIN" ]; then
  curl -sSf https://atlasgo.sh | sh
fi

if [ ! -x "$ATLAS_BIN" ]; then
  echo "Atlas CLI installation failed"
  exit 1
fi

export PATH="${HOME}/.local/bin:$PATH"

if ! echo "$DB_URL" | grep -q "://"; then
  echo "Invalid DB URL: $DB_URL"
  exit 1
fi

SCHEMA_DIR="$ROOT_DIR/$SCHEMA_PATH"
SCHEMA_FILE="$SCHEMA_DIR/schema.hcl"
if [ ! -d "$SCHEMA_DIR" ]; then
  echo "Schema directory not found: $SCHEMA_DIR"
  exit 1
fi

if ! [ -f "$SCHEMA_FILE" ]; then
  SQL_FILE="$SCHEMA_DIR/schema.sql"
  if [ ! -f "$SQL_FILE" ]; then
    echo "No schema.hcl or schema.sql found under: $SCHEMA_DIR"
    exit 1
  fi

  TMP_SCHEMA_FILE=$(mktemp /tmp/hominem-schema.XXXXXX.hcl)
  cp "$SQL_FILE" "$TMP_SCHEMA_FILE"
  SCHEMA_FILE="$TMP_SCHEMA_FILE"
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  docker stop "$DB_CONTAINER" >/dev/null 2>&1 || true
  docker rm "$DB_CONTAINER" >/dev/null 2>&1 || true
fi

echo "Starting database for Atlas validation..."
docker run -d --name "$DB_CONTAINER" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hominem-test \
  -p ${DB_PORT}:5432 \
  "$IMAGE" >/tmp/hominem-code-quality-db.log

echo "Waiting for PostgreSQL..."
until docker exec "$DB_CONTAINER" pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; do
  sleep 1
  if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "Test database container exited unexpectedly"
    cat /tmp/hominem-code-quality-db.log
    exit 1
  fi
  echo -n "."
done
echo ""

echo "Preparing database extensions for Atlas schema expectations..."
docker exec "$DB_CONTAINER" psql -U postgres -d hominem-test -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  extension_name text;
  extension_names text[] := '{pgcrypto,pg_trgm,postgis}';
  extension_schema text;
BEGIN
  FOREACH extension_name IN ARRAY extension_names LOOP
    SELECT n.nspname
    INTO extension_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = extension_name;

    IF extension_schema IS NULL THEN
      EXECUTE format('CREATE EXTENSION %I WITH SCHEMA public', extension_name);
    ELSIF extension_schema <> 'public' THEN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA public', extension_name);
    END IF;
  END LOOP;
END $$;
SQL

echo "Validating Atlas CLI flags in this environment..."
"$ATLAS_BIN" schema apply --help | grep -q -- "--to" || {
  echo "Atlas CLI help output does not include --to"
  exit 1
}

run_apply() {
  "$ATLAS_BIN" schema apply \
    --to "file://${SCHEMA_FILE}" \
    --dev-url "$DB_URL" \
    --url "$DB_URL" \
    --auto-approve
}

run_apply

echo "Verifying second run is idempotent..."
DRY_OUTPUT=$(mktemp /tmp/hominem-schema-dry.XXXXXX.log)
"$ATLAS_BIN" schema apply --to "file://${SCHEMA_FILE}" --dev-url "$DB_URL" --url "$DB_URL" --dry-run >"$DRY_OUTPUT"
cat "$DRY_OUTPUT"
rm -f "$DRY_OUTPUT"
DRY_OUTPUT=""

run_apply

echo "CI database setup flow validated successfully"
