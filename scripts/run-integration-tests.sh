#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

make infra-up

if [ "$#" -gt 0 ]; then
  exec "$ROOT_DIR/scripts/with-fresh-test-db.sh" bun run "$@" test:integration
fi

"$ROOT_DIR/scripts/with-fresh-test-db.sh" bun run --filter @hominem/api test:integration
exec "$ROOT_DIR/scripts/with-fresh-test-db.sh" bun run --filter @hominem/api test:contract
