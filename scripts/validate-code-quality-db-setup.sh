#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel)
MIGRATIONS_PATH=${CI_DB_MIGRATIONS_PATH:-"packages/db/migrations"}
DB_PORT=55433
DB_CONTAINER="hominem-code-quality-db-setup"
DB_URL="postgres://postgres:postgres@localhost:${DB_PORT}/hominem-test?sslmode=disable"
IMAGE="ghcr.io/hackefeller/postgres:latest"
GOOSE_BIN="${HOME}/.local/bin/goose-migrate"
DB_LOG_FILE="$(mktemp)"

cleanup() {
  rm -f "$DB_LOG_FILE"
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

if [ ! -x "$GOOSE_BIN" ]; then
  bash "${ROOT_DIR}/scripts/install-goose.sh"
fi

if [ ! -x "$GOOSE_BIN" ]; then
  echo "Goose CLI installation failed"
  exit 1
fi

export PATH="${HOME}/.local/bin:$PATH"

if ! echo "$DB_URL" | grep -q "://"; then
  echo "Invalid DB URL: $DB_URL"
  exit 1
fi

MIGRATIONS_DIR="$ROOT_DIR/$MIGRATIONS_PATH"
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  docker stop "$DB_CONTAINER" >/dev/null 2>&1 || true
  docker rm "$DB_CONTAINER" >/dev/null 2>&1 || true
fi

echo "Starting database for Goose validation..."
docker run -d --name "$DB_CONTAINER" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hominem-test \
  -p ${DB_PORT}:5432 \
  "$IMAGE" >"$DB_LOG_FILE"

echo "Waiting for PostgreSQL..."
until docker exec "$DB_CONTAINER" pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; do
  sleep 1
  if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "Test database container exited unexpectedly"
    cat "$DB_LOG_FILE"
    exit 1
  fi
  echo -n "."
done
echo ""

run_up() {
  "$GOOSE_BIN" -dir "$MIGRATIONS_DIR" postgres "$DB_URL" up
}

run_up

echo "Verifying second run is idempotent..."
run_up

STATUS_OUTPUT=$("$GOOSE_BIN" -dir "$MIGRATIONS_DIR" postgres "$DB_URL" status)
echo "$STATUS_OUTPUT"

if echo "$STATUS_OUTPUT" | grep -E 'Pending|pending' >/dev/null 2>&1; then
  echo "Goose status still shows pending migrations after up"
  exit 1
fi

echo "CI database setup flow validated successfully with Goose"
