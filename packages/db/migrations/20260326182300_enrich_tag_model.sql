-- +goose Up
CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA public;

ALTER TABLE app.tags
  ADD COLUMN slug text,
  ADD COLUMN path public.ltree,
  ADD COLUMN icon text,
  ADD COLUMN created_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  ADD COLUMN archived_at timestamptz;

UPDATE app.tags
SET
  slug = regexp_replace(
    regexp_replace(lower(btrim(name)), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)',
    '',
    'g'
  ),
  path = replace(
    regexp_replace(
      regexp_replace(lower(btrim(name)), '[^a-z0-9]+', '-', 'g'),
      '(^-+|-+$)',
      '',
      'g'
    ),
    '-',
    '_'
  )::public.ltree,
  created_by_userId = owner_userId
WHERE slug IS NULL
   OR path IS NULL
   OR created_by_userId IS NULL;

ALTER TABLE app.tags
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN path SET NOT NULL,
  ADD CONSTRAINT app_tags_slug_not_blank CHECK (length(btrim(slug)) > 0);

CREATE TABLE app.space_tags (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  space_id uuid NOT NULL REFERENCES app.spaces(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES app.tags(id) ON DELETE CASCADE,
  created_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.tag_aliases (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tag_id uuid NOT NULL REFERENCES app.tags(id) ON DELETE CASCADE,
  alias text NOT NULL,
  alias_slug text NOT NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_tag_aliases_alias_not_blank CHECK (length(btrim(alias)) > 0),
  CONSTRAINT app_tag_aliases_alias_slug_not_blank CHECK (length(btrim(alias_slug)) > 0)
);

ALTER TABLE app.tag_assignments
  DROP CONSTRAINT IF EXISTS app_tag_assignments_tag_entity_key,
  ADD COLUMN assignment_source text NOT NULL DEFAULT 'user',
  ADD COLUMN confidence numeric(4,3),
  ADD COLUMN removed_at timestamptz,
  ADD COLUMN assignment_period tstzrange GENERATED ALWAYS AS (
    tstzrange(createdAt, coalesce(removed_at, 'infinity'::timestamptz), '[)')
  ) STORED,
  ADD CONSTRAINT app_tag_assignments_assignment_source_check CHECK (
    assignment_source IN ('user', 'agent', 'import', 'rule')
  ),
  ADD CONSTRAINT app_tag_assignments_confidence_range_check CHECK (
    confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
  ),
  ADD CONSTRAINT app_tag_assignments_removed_after_created_check CHECK (
    removed_at IS NULL OR removed_at >= createdAt
  );

DROP INDEX IF EXISTS app.app_tags_owner_name_key;
CREATE UNIQUE INDEX app_tags_owner_name_key
  ON app.tags (owner_userId, lower(name))
  WHERE archived_at IS NULL;

CREATE UNIQUE INDEX app_tags_owner_slug_key
  ON app.tags (owner_userId, slug)
  WHERE archived_at IS NULL;

CREATE INDEX app_tags_path_idx
  ON app.tags USING gist (path);

CREATE INDEX app_tags_name_trgm_idx
  ON app.tags USING gin (lower(name) gin_trgm_ops);

CREATE INDEX app_tags_slug_trgm_idx
  ON app.tags USING gin (lower(slug) gin_trgm_ops);

CREATE UNIQUE INDEX app_space_tags_space_id_tag_id_key
  ON app.space_tags (space_id, tag_id);

CREATE INDEX app_space_tags_tag_id_idx
  ON app.space_tags (tag_id);

CREATE UNIQUE INDEX app_tag_aliases_tag_id_alias_slug_key
  ON app.tag_aliases (tag_id, alias_slug);

CREATE INDEX app_tag_aliases_alias_trgm_idx
  ON app.tag_aliases USING gin (lower(alias) gin_trgm_ops);

DROP INDEX IF EXISTS app.app_tag_assignments_tag_id_idx;
CREATE INDEX app_tag_assignments_tag_id_idx
  ON app.tag_assignments (tag_id, createdAt DESC);

DROP INDEX IF EXISTS app.app_tag_assignments_entity_idx;
CREATE INDEX app_tag_assignments_entity_idx
  ON app.tag_assignments (entity_table, entity_id, createdAt DESC);

CREATE UNIQUE INDEX app_tag_assignments_active_key
  ON app.tag_assignments (tag_id, entity_table, entity_id)
  WHERE removed_at IS NULL;

CREATE INDEX app_tag_assignments_active_tag_id_idx
  ON app.tag_assignments (tag_id, createdAt DESC)
  WHERE removed_at IS NULL;

CREATE INDEX app_tag_assignments_active_entity_idx
  ON app.tag_assignments (entity_table, entity_id, createdAt DESC)
  WHERE removed_at IS NULL;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.is_tag_owner(target_tag_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.tags tag
    WHERE tag.id = target_tag_id
      AND (
        auth.is_service_role()
        OR tag.owner_userId = auth.current_user_id()
      )
  )
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.can_read_tag(target_tag_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT
    auth.is_tag_owner(target_tag_id)
    OR EXISTS (
      SELECT 1
      FROM app.space_tags space_tag
      WHERE space_tag.tag_id = target_tag_id
        AND (
          auth.owns_space(space_tag.space_id)
          OR auth.is_space_member(space_tag.space_id)
        )
    )
$$;
-- +goose StatementEnd

ALTER TABLE app.space_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.space_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE app.tag_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tag_aliases FORCE ROW LEVEL SECURITY;

CREATE POLICY app_tags_shared_select_policy ON app.tags
  FOR SELECT
  USING (auth.can_read_tag(id));

CREATE POLICY app_space_tags_select_policy ON app.space_tags
  FOR SELECT
  USING (
    auth.is_service_role()
    OR auth.is_tag_owner(tag_id)
    OR auth.owns_space(space_id)
    OR auth.is_space_member(space_id)
  );

CREATE POLICY app_space_tags_write_policy ON app.space_tags
  FOR ALL
  USING (
    auth.is_service_role()
    OR auth.is_tag_owner(tag_id)
    OR auth.owns_space(space_id)
  )
  WITH CHECK (
    auth.is_service_role()
    OR auth.is_tag_owner(tag_id)
    OR auth.owns_space(space_id)
  );

CREATE POLICY app_tag_aliases_select_policy ON app.tag_aliases
  FOR SELECT
  USING (auth.can_read_tag(tag_id));

CREATE POLICY app_tag_aliases_write_policy ON app.tag_aliases
  FOR ALL
  USING (auth.is_tag_owner(tag_id))
  WITH CHECK (auth.is_tag_owner(tag_id));

DROP POLICY IF EXISTS app_tag_assignments_select_policy ON app.tag_assignments;
CREATE POLICY app_tag_assignments_select_policy ON app.tag_assignments
  FOR SELECT
  USING (
    auth.is_service_role()
    OR auth.can_read_tag(tag_id)
    OR auth.can_access_entity(entity_table, entity_id)
  );

DROP POLICY IF EXISTS app_tag_assignments_owner_write_policy ON app.tag_assignments;
CREATE POLICY app_tag_assignments_owner_write_policy ON app.tag_assignments
  FOR ALL
  USING (
    auth.is_service_role()
    OR (
      auth.can_read_tag(tag_id)
      AND auth.can_access_entity(entity_table, entity_id)
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR (
      auth.can_read_tag(tag_id)
      AND auth.can_access_entity(entity_table, entity_id)
    )
  );

-- +goose Down
DROP POLICY IF EXISTS app_tag_assignments_owner_write_policy ON app.tag_assignments;
CREATE POLICY app_tag_assignments_owner_write_policy ON app.tag_assignments
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.tags tag
      WHERE tag.id = tag_assignments.tag_id
        AND tag.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.tags tag
      WHERE tag.id = tag_assignments.tag_id
        AND tag.owner_userId = auth.current_user_id()
    )
  );

DROP POLICY IF EXISTS app_tag_assignments_select_policy ON app.tag_assignments;
CREATE POLICY app_tag_assignments_select_policy ON app.tag_assignments
  FOR SELECT
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.tags tag
      WHERE tag.id = tag_assignments.tag_id
        AND tag.owner_userId = auth.current_user_id()
    )
    OR auth.can_access_entity(tag_assignments.entity_table, tag_assignments.entity_id)
  );

DROP POLICY IF EXISTS app_tag_aliases_write_policy ON app.tag_aliases;
DROP POLICY IF EXISTS app_tag_aliases_select_policy ON app.tag_aliases;
DROP POLICY IF EXISTS app_space_tags_write_policy ON app.space_tags;
DROP POLICY IF EXISTS app_space_tags_select_policy ON app.space_tags;
DROP POLICY IF EXISTS app_tags_shared_select_policy ON app.tags;

ALTER TABLE app.tag_aliases NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.tag_aliases DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.space_tags NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.space_tags DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS auth.can_read_tag(uuid);
DROP FUNCTION IF EXISTS auth.is_tag_owner(uuid);

DROP INDEX IF EXISTS app.app_tag_assignments_active_entity_idx;
DROP INDEX IF EXISTS app.app_tag_assignments_active_tag_id_idx;
DROP INDEX IF EXISTS app.app_tag_assignments_active_key;
DROP INDEX IF EXISTS app.app_tag_assignments_entity_idx;
DROP INDEX IF EXISTS app.app_tag_assignments_tag_id_idx;
DROP INDEX IF EXISTS app.app_space_tags_tag_id_idx;
DROP INDEX IF EXISTS app.app_space_tags_space_id_tag_id_key;
DROP INDEX IF EXISTS app.app_tag_aliases_alias_trgm_idx;
DROP INDEX IF EXISTS app.app_tag_aliases_tag_id_alias_slug_key;
DROP INDEX IF EXISTS app.app_tags_slug_trgm_idx;
DROP INDEX IF EXISTS app.app_tags_name_trgm_idx;
DROP INDEX IF EXISTS app.app_tags_path_idx;
DROP INDEX IF EXISTS app.app_tags_owner_slug_key;
DROP INDEX IF EXISTS app.app_tags_owner_name_key;

CREATE UNIQUE INDEX app_tags_owner_name_key
  ON app.tags (owner_userId, lower(name));

DROP TABLE IF EXISTS app.tag_aliases;
DROP TABLE IF EXISTS app.space_tags;

ALTER TABLE app.tag_assignments
  DROP CONSTRAINT IF EXISTS app_tag_assignments_removed_after_created_check,
  DROP CONSTRAINT IF EXISTS app_tag_assignments_confidence_range_check,
  DROP CONSTRAINT IF EXISTS app_tag_assignments_assignment_source_check,
  DROP COLUMN IF EXISTS assignment_period,
  DROP COLUMN IF EXISTS removed_at,
  DROP COLUMN IF EXISTS confidence,
  DROP COLUMN IF EXISTS assignment_source,
  ADD CONSTRAINT app_tag_assignments_tag_entity_key UNIQUE (tag_id, entity_table, entity_id);

CREATE INDEX app_tag_assignments_tag_id_idx
  ON app.tag_assignments (tag_id);

CREATE INDEX app_tag_assignments_entity_idx
  ON app.tag_assignments (entity_table, entity_id);

ALTER TABLE app.tags
  DROP CONSTRAINT IF EXISTS app_tags_slug_not_blank,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS created_by_userId,
  DROP COLUMN IF EXISTS icon,
  DROP COLUMN IF EXISTS path,
  DROP COLUMN IF EXISTS slug;

DROP EXTENSION IF EXISTS ltree;
