#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
MIGRATIONS_DIR="${ROOT_DIR}/packages/db/migrations"
BASELINE_FILE="${MIGRATIONS_DIR}/20260309120000_schema_baseline.sql"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

HAS_RG=0
if command -v rg >/dev/null 2>&1; then
  HAS_RG=1
fi

shopt -s nullglob
FILES=("${MIGRATIONS_DIR}"/*.sql)
shopt -u nullglob

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No migration SQL files found"
  exit 1
fi

for file in "${FILES[@]}"; do
  if [ "$file" = "$BASELINE_FILE" ]; then
    continue
  fi

  if [ "$HAS_RG" -eq 1 ]; then
    if rg -i --line-number 'drop[[:space:]]+column|drop[[:space:]]+table|alter[[:space:]]+table.+alter[[:space:]]+column.+type' "$file" >/dev/null; then
      echo "Dangerous migration pattern found in $file"
      rg -i --line-number 'drop[[:space:]]+column|drop[[:space:]]+table|alter[[:space:]]+table.+alter[[:space:]]+column.+type' "$file"
      exit 1
    fi
  else
    if grep -Ein 'drop[[:space:]]+column|drop[[:space:]]+table|alter[[:space:]]+table.+alter[[:space:]]+column.+type' "$file" >/dev/null; then
      echo "Dangerous migration pattern found in $file"
      grep -Ein 'drop[[:space:]]+column|drop[[:space:]]+table|alter[[:space:]]+table.+alter[[:space:]]+column.+type' "$file"
      exit 1
    fi
  fi
done

echo "Goose migration lint passed"
