#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DB_CONTAINER="hominem-test-postgres"

cd "$ROOT_DIR"

make dev-up

TABLE_COUNT="$(docker exec "$TEST_DB_CONTAINER" psql -U postgres -d hominem-test -At -c "select count(*) from information_schema.tables where table_schema = 'public' and table_name <> 'spatial_ref_sys'")"
GOOSE_STATUS="$("$ROOT_DIR/scripts/with-test-env.sh" bun run --filter @hominem/db goose:status 2>/dev/null || true)"

if [ "$TABLE_COUNT" = "0" ]; then
  make db-migrate-test
elif printf '%s' "$GOOSE_STATUS" | grep -q 'Pending                  -- 20260309120000_schema_baseline.sql'; then
  printf '%s\n' 'Using existing local test database state'
else
  make db-migrate-test
fi

if [ "$#" -gt 0 ]; then
  exec "$ROOT_DIR/scripts/with-test-env.sh" bun run "$@" test:integration
fi

"$ROOT_DIR/scripts/with-test-env.sh" bun run --filter @hominem/api test:integration
exec "$ROOT_DIR/scripts/with-test-env.sh" bun run --filter @hominem/api test:contract
