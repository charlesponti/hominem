-- +goose Up
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- +goose StatementBegin
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema IN ('auth', 'app', 'ops')
      AND column_name = 'id'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN id SET DEFAULT uuidv7()',
      target.table_schema,
      target.table_name
    );
  END LOOP;
END
$$;
-- +goose StatementEnd

ALTER TABLE app.note_shares
  ADD COLUMN granted_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  ADD COLUMN expiresAt timestamptz,
  ADD COLUMN revokedAt timestamptz,
  ADD COLUMN access_period tstzrange GENERATED ALWAYS AS (
    tstzrange(createdAt, coalesce(revokedAt, expiresAt, 'infinity'::timestamptz), '[)')
  ) STORED;

ALTER TABLE app.note_shares
  DROP CONSTRAINT IF EXISTS app_note_shares_note_id_shared_with_userId_key;

ALTER TABLE app.note_shares
  ADD CONSTRAINT app_note_shares_expires_after_created_check CHECK (
    expiresAt IS NULL OR expiresAt >= createdAt
  ),
  ADD CONSTRAINT app_note_shares_revoked_after_created_check CHECK (
    revokedAt IS NULL OR revokedAt >= createdAt
  ),
  ADD CONSTRAINT app_note_shares_access_period_not_empty CHECK (
    NOT isempty(access_period)
  ),
  ADD CONSTRAINT app_note_shares_active_window_key UNIQUE (
    note_id,
    shared_with_userId,
    access_period WITHOUT OVERLAPS
  );

CREATE INDEX app_note_shares_granted_by_userId_idx
  ON app.note_shares (granted_by_userId)
  WHERE granted_by_userId IS NOT NULL;

ALTER TABLE app.space_members
  DROP CONSTRAINT IF EXISTS app_space_members_pkey,
  DROP CONSTRAINT IF EXISTS space_members_pkey,
  DROP CONSTRAINT IF EXISTS app_list_members_pkey,
  DROP CONSTRAINT IF EXISTS list_members_pkey;

ALTER TABLE app.space_members
  ADD COLUMN id uuid DEFAULT uuidv7(),
  ADD COLUMN membership_period tstzrange NOT NULL DEFAULT tstzrange(now(), 'infinity'::timestamptz, '[)');

UPDATE app.space_members
SET id = uuidv7()
WHERE id IS NULL;

ALTER TABLE app.space_members
  ALTER COLUMN id SET NOT NULL;

ALTER TABLE app.space_members
  ADD CONSTRAINT app_space_members_pkey PRIMARY KEY (id),
  ADD CONSTRAINT app_space_members_membership_period_not_empty CHECK (
    NOT isempty(membership_period)
  ),
  ADD CONSTRAINT app_space_members_active_window_key UNIQUE (
    space_id,
    userId,
    membership_period WITHOUT OVERLAPS
  );

CREATE INDEX app_space_members_space_id_userId_idx
  ON app.space_members (space_id, userId);

ALTER TABLE app.space_invites
  ADD COLUMN expiresAt timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN revokedAt timestamptz,
  ADD COLUMN invited_user_email_normalized text GENERATED ALWAYS AS (
    lower(invited_user_email)
  ) STORED,
  ADD COLUMN invite_window tstzrange GENERATED ALWAYS AS (
    tstzrange(
      createdAt,
      coalesce(accepted_at, revokedAt, expiresAt, 'infinity'::timestamptz),
      '[)'
    )
  ) STORED;

ALTER TABLE app.space_invites
  ADD CONSTRAINT app_space_invites_expires_after_created_check CHECK (
    expiresAt >= createdAt
  ),
  ADD CONSTRAINT app_space_invites_accepted_after_created_check CHECK (
    accepted_at IS NULL OR accepted_at >= createdAt
  ),
  ADD CONSTRAINT app_space_invites_revoked_after_created_check CHECK (
    revokedAt IS NULL OR revokedAt >= createdAt
  ),
  ADD CONSTRAINT app_space_invites_invite_window_not_empty CHECK (
    NOT isempty(invite_window)
  ),
  ADD CONSTRAINT app_space_invites_active_window_key UNIQUE (
    space_id,
    invited_user_email_normalized,
    invite_window WITHOUT OVERLAPS
  );

DROP INDEX IF EXISTS app.app_space_invites_email_lower_idx;
DROP INDEX IF EXISTS app.app_list_invites_email_lower_idx;

CREATE INDEX app_space_invites_email_lower_idx
  ON app.space_invites (invited_user_email_normalized);

ALTER TABLE app.tasks
  ADD CONSTRAINT app_tasks_id_space_id_key UNIQUE (id, space_id);

CREATE TABLE app.task_assignments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  task_id uuid NOT NULL,
  space_id uuid NOT NULL,
  assignee_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  assigned_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  assignment_period tstzrange NOT NULL DEFAULT tstzrange(now(), 'infinity'::timestamptz, '[)'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_task_assignments_period_not_empty CHECK (NOT isempty(assignment_period)),
  CONSTRAINT app_task_assignments_task_space_fkey
    FOREIGN KEY (task_id, space_id) REFERENCES app.tasks(id, space_id) ON DELETE CASCADE,
  CONSTRAINT app_task_assignments_membership_fkey
    FOREIGN KEY (space_id, assignee_userId, PERIOD assignment_period)
    REFERENCES app.space_members(space_id, userId, PERIOD membership_period),
  CONSTRAINT app_task_assignments_active_window_key UNIQUE (
    task_id,
    assignee_userId,
    assignment_period WITHOUT OVERLAPS
  )
);

CREATE INDEX app_task_assignments_task_id_idx
  ON app.task_assignments (task_id);

CREATE INDEX app_task_assignments_assignee_userId_idx
  ON app.task_assignments (assignee_userId);

CREATE TABLE app.entity_links (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  space_id uuid REFERENCES app.spaces(id) ON DELETE SET NULL,
  from_entity_table regclass NOT NULL,
  from_entity_id uuid NOT NULL,
  relation_type text NOT NULL,
  to_entity_table regclass NOT NULL,
  to_entity_id uuid NOT NULL,
  valid_during tstzrange NOT NULL DEFAULT tstzrange(now(), 'infinity'::timestamptz, '[)'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_entity_links_relation_type_not_blank CHECK (length(btrim(relation_type)) > 0),
  CONSTRAINT app_entity_links_valid_during_not_empty CHECK (NOT isempty(valid_during)),
  CONSTRAINT app_entity_links_distinct_endpoints_check CHECK (
    from_entity_table <> to_entity_table
    OR from_entity_id <> to_entity_id
  ),
  CONSTRAINT app_entity_links_active_window_key UNIQUE (
    owner_userId,
    from_entity_table,
    from_entity_id,
    relation_type,
    to_entity_table,
    to_entity_id,
    valid_during WITHOUT OVERLAPS
  )
);

CREATE INDEX app_entity_links_owner_userId_idx
  ON app.entity_links (owner_userId, createdAt DESC);

CREATE INDEX app_entity_links_space_id_idx
  ON app.entity_links (space_id)
  WHERE space_id IS NOT NULL;

CREATE INDEX app_entity_links_from_idx
  ON app.entity_links (from_entity_table, from_entity_id);

CREATE INDEX app_entity_links_to_idx
  ON app.entity_links (to_entity_table, to_entity_id);

CREATE TRIGGER app_entity_links_set_updated_at
  BEFORE UPDATE ON app.entity_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.can_read_note(target_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.notes note
    WHERE note.id = target_note_id
      AND (
        auth.is_service_role()
        OR note.owner_userId = auth.current_user_id()
        OR EXISTS (
          SELECT 1
          FROM app.note_shares share
          WHERE share.note_id = note.id
            AND share.shared_with_userId = auth.current_user_id()
            AND share.access_period @> now()
        )
      )
  )
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.is_space_member(target_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.space_members member
    WHERE member.space_id = target_space_id
      AND member.membership_period @> now()
      AND (
        auth.is_service_role()
        OR member.userId = auth.current_user_id()
      )
  )
$$;
-- +goose StatementEnd

DROP POLICY IF EXISTS app_note_shares_select_policy ON app.note_shares;
CREATE POLICY app_note_shares_select_policy ON app.note_shares
  FOR SELECT
  USING (
    auth.is_service_role()
    OR auth.can_write_note(note_id)
    OR (
      shared_with_userId = auth.current_user_id()
      AND access_period @> now()
    )
  );

DROP POLICY IF EXISTS app_space_invites_select_policy ON app.space_invites;
CREATE POLICY app_space_invites_select_policy ON app.space_invites
  FOR SELECT
  USING (
    auth.is_service_role()
    OR inviter_userId = auth.current_user_id()
    OR auth.owns_space(space_id)
    OR (
      invited_userId = auth.current_user_id()
      AND invite_window @> now()
    )
  );

ALTER TABLE app.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY app_task_assignments_select_policy ON app.task_assignments
  FOR SELECT
  USING (
    auth.is_service_role()
    OR assignee_userId = auth.current_user_id()
    OR EXISTS (
      SELECT 1
      FROM app.tasks task
      WHERE task.id = task_assignments.task_id
        AND (
          task.owner_userId = auth.current_user_id()
          OR (
            task.space_id IS NOT NULL
            AND auth.is_space_member(task.space_id)
          )
        )
    )
  );

CREATE POLICY app_task_assignments_owner_write_policy ON app.task_assignments
  FOR ALL
  USING (
    auth.is_service_role()
    OR auth.owns_space(space_id)
    OR EXISTS (
      SELECT 1
      FROM app.tasks task
      WHERE task.id = task_assignments.task_id
        AND task.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR auth.owns_space(space_id)
    OR EXISTS (
      SELECT 1
      FROM app.tasks task
      WHERE task.id = task_assignments.task_id
        AND task.owner_userId = auth.current_user_id()
    )
  );

ALTER TABLE app.entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.entity_links FORCE ROW LEVEL SECURITY;

CREATE POLICY app_entity_links_select_policy ON app.entity_links
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      space_id IS NOT NULL
      AND auth.is_space_member(space_id)
    )
  );

CREATE POLICY app_entity_links_write_policy ON app.entity_links
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      space_id IS NOT NULL
      AND auth.owns_space(space_id)
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      space_id IS NOT NULL
      AND auth.owns_space(space_id)
    )
  );

-- +goose Down
DROP POLICY IF EXISTS app_entity_links_write_policy ON app.entity_links;
DROP POLICY IF EXISTS app_entity_links_select_policy ON app.entity_links;
ALTER TABLE app.entity_links NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.entity_links DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_task_assignments_owner_write_policy ON app.task_assignments;
DROP POLICY IF EXISTS app_task_assignments_select_policy ON app.task_assignments;
ALTER TABLE app.task_assignments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.task_assignments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_space_invites_select_policy ON app.space_invites;
CREATE POLICY app_space_invites_select_policy ON app.space_invites
  FOR SELECT
  USING (
    auth.is_service_role()
    OR inviter_userId = auth.current_user_id()
    OR invited_userId = auth.current_user_id()
    OR auth.owns_space(space_id)
  );

DROP POLICY IF EXISTS app_note_shares_select_policy ON app.note_shares;
CREATE POLICY app_note_shares_select_policy ON app.note_shares
  FOR SELECT
  USING (
    auth.is_service_role()
    OR shared_with_userId = auth.current_user_id()
    OR auth.can_write_note(note_id)
  );

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.is_space_member(target_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.space_members member
    WHERE member.space_id = target_space_id
      AND (
        auth.is_service_role()
        OR member.userId = auth.current_user_id()
      )
  )
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.can_read_note(target_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.notes note
    WHERE note.id = target_note_id
      AND (
        auth.is_service_role()
        OR note.owner_userId = auth.current_user_id()
        OR EXISTS (
          SELECT 1
          FROM app.note_shares share
          WHERE share.note_id = note.id
            AND share.shared_with_userId = auth.current_user_id()
        )
      )
  )
$$;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS app_entity_links_set_updated_at ON app.entity_links;

DROP INDEX IF EXISTS app.app_entity_links_to_idx;
DROP INDEX IF EXISTS app.app_entity_links_from_idx;
DROP INDEX IF EXISTS app.app_entity_links_space_id_idx;
DROP INDEX IF EXISTS app.app_entity_links_list_id_idx;
DROP INDEX IF EXISTS app.app_entity_links_owner_userId_idx;
DROP TABLE IF EXISTS app.entity_links;

DROP INDEX IF EXISTS app.app_task_assignments_assignee_userId_idx;
DROP INDEX IF EXISTS app.app_task_assignments_task_id_idx;
DROP TABLE IF EXISTS app.task_assignments;

ALTER TABLE app.tasks
  DROP CONSTRAINT IF EXISTS app_tasks_id_space_id_key,
  DROP CONSTRAINT IF EXISTS app_tasks_id_list_id_key;

DROP INDEX IF EXISTS app.app_space_invites_email_lower_idx;
DROP INDEX IF EXISTS app.app_list_invites_email_lower_idx;

ALTER TABLE app.space_invites
  DROP CONSTRAINT IF EXISTS app_space_invites_active_window_key,
  DROP CONSTRAINT IF EXISTS app_space_invites_invite_window_not_empty,
  DROP CONSTRAINT IF EXISTS app_space_invites_revoked_after_created_check,
  DROP CONSTRAINT IF EXISTS app_space_invites_accepted_after_created_check,
  DROP CONSTRAINT IF EXISTS app_space_invites_expires_after_created_check,
  DROP COLUMN IF EXISTS invite_window,
  DROP COLUMN IF EXISTS invited_user_email_normalized,
  DROP COLUMN IF EXISTS revokedAt,
  DROP COLUMN IF EXISTS expiresAt;

CREATE INDEX app_space_invites_email_lower_idx
  ON app.space_invites (lower(invited_user_email));

DROP INDEX IF EXISTS app.app_space_members_space_id_userId_idx;
DROP INDEX IF EXISTS app.app_list_members_list_id_userId_idx;

ALTER TABLE app.space_members
  DROP CONSTRAINT IF EXISTS app_space_members_active_window_key,
  DROP CONSTRAINT IF EXISTS app_space_members_membership_period_not_empty,
  DROP CONSTRAINT IF EXISTS app_space_members_pkey,
  DROP CONSTRAINT IF EXISTS list_members_pkey;

ALTER TABLE app.space_members
  ADD CONSTRAINT app_space_members_pkey PRIMARY KEY (space_id, userId);

ALTER TABLE app.space_members
  DROP COLUMN IF EXISTS membership_period,
  DROP COLUMN IF EXISTS id;

DROP INDEX IF EXISTS app.app_note_shares_granted_by_userId_idx;

ALTER TABLE app.note_shares
  DROP CONSTRAINT IF EXISTS app_note_shares_active_window_key,
  DROP CONSTRAINT IF EXISTS app_note_shares_access_period_not_empty,
  DROP CONSTRAINT IF EXISTS app_note_shares_revoked_after_created_check,
  DROP CONSTRAINT IF EXISTS app_note_shares_expires_after_created_check,
  ADD CONSTRAINT app_note_shares_note_id_shared_with_userId_key UNIQUE (note_id, shared_with_userId),
  DROP COLUMN IF EXISTS access_period,
  DROP COLUMN IF EXISTS revokedAt,
  DROP COLUMN IF EXISTS expiresAt,
  DROP COLUMN IF EXISTS granted_by_userId;

-- +goose StatementBegin
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema IN ('auth', 'app', 'ops')
      AND column_name = 'id'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()',
      target.table_schema,
      target.table_name
    );
  END LOOP;
END
$$;
-- +goose StatementEnd
