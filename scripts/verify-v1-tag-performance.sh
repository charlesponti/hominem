#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"
source "$ROOT_DIR/scripts/lib/temp-db.sh"

seed_file="$ROOT_DIR/packages/db/seeds/v1_demo_seed.sql"
setup_temp_database "$ROOT_DIR" "v1_tag_perf"

cleanup() {
  cleanup_temp_database
}

trap cleanup EXIT

create_temp_database
migrate_temp_database "$ROOT_DIR"
seed_temp_database "$seed_file"

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TEMP TABLE temp_perf_notes (
  id uuid PRIMARY KEY
);

INSERT INTO temp_perf_notes (id)
SELECT uuidv7()
FROM generate_series(1, 5000);

INSERT INTO app.notes (id, owner_user_id, source)
SELECT
  temp.id,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'manual'
FROM temp_perf_notes temp;

INSERT INTO app.tags (
  id,
  owner_user_id,
  name,
  slug,
  path,
  color,
  icon,
  created_by_user_id
)
VALUES
  (
    'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1',
    '11111111-1111-1111-1111-111111111111',
    'Wedding Dresses',
    'wedding-dresses',
    'wedding.dresses'::public.ltree,
    '#ec4899',
    'shirt',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2',
    '11111111-1111-1111-1111-111111111111',
    'Wedding Budget',
    'wedding-budget',
    'wedding.budget'::public.ltree,
    '#14b8a6',
    'banknote',
    '11111111-1111-1111-1111-111111111111'
  );

INSERT INTO app.tag_aliases (tag_id, alias, alias_slug)
VALUES
  (
    'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1',
    'bridal looks',
    'bridal-looks'
  ),
  (
    'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2',
    'wedding costs',
    'wedding-costs'
  );

INSERT INTO app.tag_assignments (
  tag_id,
  entity_table,
  entity_id,
  assigned_by_user_id,
  assignment_source
)
SELECT
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
  'app.notes'::regclass,
  temp.id,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'rule'
FROM temp_perf_notes temp;

INSERT INTO app.tag_assignments (
  tag_id,
  entity_table,
  entity_id,
  assigned_by_user_id,
  assignment_source
)
SELECT
  'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1'::uuid,
  'app.notes'::regclass,
  temp.id,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'rule'
FROM temp_perf_notes temp
WHERE mod(get_byte(uuid_send(temp.id), 15), 2) = 0;

INSERT INTO app.tag_assignments (
  tag_id,
  entity_table,
  entity_id,
  assigned_by_user_id,
  assignment_source
)
SELECT
  'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2'::uuid,
  'app.notes'::regclass,
  temp.id,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'rule'
FROM temp_perf_notes temp
WHERE mod(get_byte(uuid_send(temp.id), 14), 3) = 0;
SQL

tag_slug_count="$(psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT count(*)
FROM app.tag_assignments assignment
JOIN app.tags tag
  ON tag.id = assignment.tag_id
WHERE assignment.removed_at IS NULL
  AND tag.slug = 'wedding';
SQL
)"

tag_family_count="$(psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT count(*)
FROM app.tag_assignments assignment
JOIN app.tags tag
  ON tag.id = assignment.tag_id
WHERE assignment.removed_at IS NULL
  AND tag.path <@ 'wedding'::public.ltree;
SQL
)"

tag_intersection_count="$(psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT count(*)
FROM (
  SELECT assignment.entity_id
  FROM app.tag_assignments assignment
  JOIN app.tags tag
    ON tag.id = assignment.tag_id
  WHERE assignment.removed_at IS NULL
    AND tag.slug IN ('wedding', 'wedding-dresses')
  GROUP BY assignment.entity_id
  HAVING count(DISTINCT tag.slug) = 2
) intersected;
SQL
)"

tag_alias_count="$(psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT count(*)
FROM app.tag_aliases
WHERE lower(alias) % 'bridal loks';
SQL
)"

tag_slug_plan="$(psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
SET enable_seqscan = off;
EXPLAIN
SELECT assignment.entity_id
FROM app.tag_assignments assignment
JOIN app.tags tag
  ON tag.id = assignment.tag_id
WHERE assignment.removed_at IS NULL
  AND tag.slug = 'wedding';
SQL
)"

tag_path_plan="$(psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
SET enable_seqscan = off;
EXPLAIN
SELECT id
FROM app.tags
WHERE path <@ 'wedding'::public.ltree;
SQL
)"

tag_alias_plan="$(psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
SET enable_seqscan = off;
EXPLAIN
SELECT alias
FROM app.tag_aliases
WHERE lower(alias) % 'weding planing';
SQL
)"

if [ "$tag_slug_count" -ne 5001 ]; then
  printf '%s\n' "expected 5001 active assignments for slug wedding, got $tag_slug_count" >&2
  exit 1
fi

if [ "$tag_family_count" -le "$tag_slug_count" ]; then
  printf '%s\n' "expected wedding family count to exceed direct wedding count, got $tag_family_count" >&2
  exit 1
fi

if [ "$tag_intersection_count" -le 0 ]; then
  printf '%s\n' 'expected multi-tag intersection query to return rows' >&2
  exit 1
fi

if [ "$tag_alias_count" -le 0 ]; then
  printf '%s\n' 'expected fuzzy alias query to match at least one alias' >&2
  exit 1
fi

if ! printf '%s' "$tag_slug_plan" | grep -q 'app_tag_assignments_active_tag_id_idx'; then
  printf '%s\n' 'expected active tag assignment index in slug query plan' >&2
  printf '%s\n' "$tag_slug_plan" >&2
  exit 1
fi

if ! printf '%s' "$tag_path_plan" | grep -q 'app_tags_path_idx'; then
  printf '%s\n' 'expected tag path index in hierarchy query plan' >&2
  printf '%s\n' "$tag_path_plan" >&2
  exit 1
fi

if ! printf '%s' "$tag_alias_plan" | grep -q 'app_tag_aliases_alias_trgm_idx'; then
  printf '%s\n' 'expected trigram alias index in fuzzy query plan' >&2
  printf '%s\n' "$tag_alias_plan" >&2
  exit 1
fi

printf '%s\n' 'v1 tag performance smoke test passed'
