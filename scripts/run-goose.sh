#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${GOOSE_MIGRATIONS_DIR:-$ROOT_DIR/packages/db/migrations}"

if ! command -v goose >/dev/null 2>&1; then
  printf '%s\n' 'goose is required but not installed' >&2
  printf '%s\n' 'install it with: go install github.com/pressly/goose/v3/cmd/goose@v3.27.0' >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  printf '%s\n' 'DATABASE_URL must be set' >&2
  exit 1
fi

exec goose -dir "$MIGRATIONS_DIR" postgres "$DATABASE_URL" "$@"
