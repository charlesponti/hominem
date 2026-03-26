#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_DIR="$ROOT_DIR/packages/db"

if ! command -v sqitch >/dev/null 2>&1; then
  printf '%s\n' 'sqitch is required but not installed' >&2
  printf '%s\n' 'install it locally before using the Sqitch workflow' >&2
  exit 1
fi

cd "$DB_DIR"
exec sqitch "$@"
