#!/usr/bin/env bash
# Pulls live schema + row-count snapshots from both the warehouse SQLite db and the
# hominem Postgres db, and writes them to timestamped markdown files.
#
# This reads LIVE database state only — never migration files. Migration files
# record what changed, not what's currently applied (a table can be created in
# one migration and dropped in a later one; reading files alone gives false
# positives on rolled-back tables).
set -euo pipefail

WAREHOUSE_DB="${WAREHOUSE_DB:-$HOME/.hominem/warehouse.db}"
HOMINEM_DATABASE_URL="${HOMINEM_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5434/hominem}"
OUT_DIR="${OUT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/snapshots}"
TS="$(date +%Y%m%d_%H%M%S)"
HOMINEM_SOURCE='<redacted Postgres URL>'

mkdir -p "$OUT_DIR"

WAREHOUSE_OUT="$OUT_DIR/warehouse_${TS}.md"
HOMINEM_OUT="$OUT_DIR/hominem_${TS}.md"

# ---------------------------------------------------------------------------
# Warehouse (SQLite)
# ---------------------------------------------------------------------------
if [[ ! -f "$WAREHOUSE_DB" ]]; then
  echo "error: warehouse db not found at $WAREHOUSE_DB" >&2
  exit 1
fi

{
  echo "# Warehouse schema snapshot"
  echo
  echo "Source: \`$WAREHOUSE_DB\`"
  echo "Pulled: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## Tables (row count, columns)"
  echo

  tables="$(sqlite3 "$WAREHOUSE_DB" ".tables" | tr -s ' \n' '\n' | grep -v '^$' | sort)"
  for t in $tables; do
    count="$(sqlite3 "$WAREHOUSE_DB" "SELECT COUNT(*) FROM \"$t\";" 2>/dev/null || echo "?")"
    cols="$(sqlite3 "$WAREHOUSE_DB" "PRAGMA table_info(\"$t\");" | awk -F'|' '{print $2" "$3}' | paste -sd, -)"
    echo "### \`$t\` ($count rows)"
    echo
    echo "$cols"
    echo
  done
} > "$WAREHOUSE_OUT"

echo "Wrote $WAREHOUSE_OUT"

# ---------------------------------------------------------------------------
# Hominem (Postgres) — app, auth, public, ops schemas
# ---------------------------------------------------------------------------
{
  echo "# Hominem schema snapshot"
  echo
  echo "Source: \`$HOMINEM_SOURCE\`"
  echo "Pulled: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo

  for schema in app auth public ops; do
    echo "## Schema \`$schema\`"
    echo

    tables="$(psql "$HOMINEM_DATABASE_URL" -Atqc "
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = '$schema' ORDER BY table_name;
    ")"

    if [[ -z "$tables" ]]; then
      echo "_(no tables)_"
      echo
      continue
    fi

    while IFS= read -r t; do
      [[ -z "$t" ]] && continue
      count="$(psql "$HOMINEM_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM \"$schema\".\"$t\";" 2>/dev/null || echo "?")"
      cols="$(psql "$HOMINEM_DATABASE_URL" -Atqc "
        SELECT string_agg(column_name || ' ' || data_type, ', ' ORDER BY ordinal_position)
        FROM information_schema.columns
        WHERE table_schema = '$schema' AND table_name = '$t';
      ")"
      echo "### \`$schema.$t\` ($count rows)"
      echo
      echo "$cols"
      echo
    done <<< "$tables"
  done
} > "$HOMINEM_OUT"

echo "Wrote $HOMINEM_OUT"
