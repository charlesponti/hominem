#!/usr/bin/env bash
# Flags DROP statements in migrations that aren't schema-qualified.
#
# Postgres resolves an unqualified object name against `search_path`
# (default "$user", public), not against whatever schema the rest of the
# migration operates on. `DROP INDEX IF EXISTS foo` silently no-ops if `foo`
# lives in `app` but isn't found in `public` -- IF EXISTS swallows the
# "doesn't exist" error, so the migration reports success without doing
# anything. This bit us for real: 20260731180000_normalize_career_events_and_
# skill_sources.sql shipped with six unqualified DROP INDEX statements that
# silently no-op'd on first apply.
#
# Auditing the full migration history turned up the same pattern scattered
# across many pre-existing Down blocks (unqualified `DROP INDEX
# app_..._idx`) -- those are long-applied and rewriting them is its own,
# separate decision, not something to retroactively block on here. By
# default this script only checks migration files that are new or modified
# relative to a base ref, so it guards future migrations without treating
# existing history as a build failure. Pass --all to audit everything.
#
# Usage:
#   check-schema-qualified-drops.sh              # changed files vs origin/main
#   check-schema-qualified-drops.sh --since REF  # changed files vs REF
#   check-schema-qualified-drops.sh --all        # every migration file
#   check-schema-qualified-drops.sh FILE...      # explicit file list
#
# DROP TRIGGER / DROP POLICY are exempt: their syntax is
# `DROP ... name ON [schema.]table`, so they're already schema-scoped via
# the table reference, not via search_path resolution of the object name.
#
# Only files that reference a non-public schema (app./auth.) are checked --
# plenty of legitimate migrations drop unqualified names that really do
# live in `public` (e.g. Better Auth's passkey/jwks/session tables), and
# those aren't the risk this guards against.

set -euo pipefail

migrations_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../migrations" && pwd)"

files=()
case "${1:-}" in
  --all)
    while IFS= read -r -d '' f; do files+=("$f"); done < <(find "$migrations_dir" -maxdepth 1 -name '*.sql' -print0)
    ;;
  --since)
    base="${2:?--since requires a ref}"
    while IFS= read -r f; do
      [ -n "$f" ] && files+=("$migrations_dir/$(basename "$f")")
    done < <(git -C "$migrations_dir" diff --name-only --diff-filter=ACM "$base"...HEAD -- '*.sql' | xargs -I{} basename {} 2>/dev/null || true)
    ;;
  "")
    while IFS= read -r f; do
      [ -n "$f" ] && files+=("$migrations_dir/$(basename "$f")")
    done < <(git -C "$migrations_dir" diff --name-only --diff-filter=ACM origin/main...HEAD -- '*.sql' | xargs -I{} basename {} 2>/dev/null || true)
    ;;
  *)
    files=("$@")
    ;;
esac

if [ "${#files[@]}" -eq 0 ]; then
  echo "No migration files to check."
  exit 0
fi

failures=0

for file in "${files[@]}"; do
  [ -f "$file" ] || continue
  grep -qE '\b(app|auth)\.' "$file" || continue

  while IFS=: read -r line_no line; do
    [ -z "${line_no:-}" ] && continue
    echo "::error file=${file},line=${line_no}::Unqualified DROP (no schema prefix)" >&2
    echo "  ${file}:${line_no}:${line}" >&2
    failures=1
  done < <(
    grep -nE '^[[:space:]]*DROP[[:space:]]+(INDEX|FUNCTION|TYPE|SEQUENCE|TABLE|VIEW)[[:space:]]+IF[[:space:]]+EXISTS[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*[(;]' "$file" \
      | grep -vE 'IF[[:space:]]+EXISTS[[:space:]]+[A-Za-z_][A-Za-z0-9_]*\.' \
      || true
  )
done

if [ "$failures" -ne 0 ]; then
  echo "" >&2
  echo "Found DROP statements above without a schema prefix (e.g. 'app.foo' instead of 'foo')." >&2
  echo "These resolve against search_path, not the schema the migration operates on, and silently" >&2
  echo "no-op under IF EXISTS if the object isn't found there. Schema-qualify them." >&2
  exit 1
fi

echo "All checked migration files have schema-qualified DROP statements."
