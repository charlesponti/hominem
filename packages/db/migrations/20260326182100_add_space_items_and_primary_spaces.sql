-- +goose Up
ALTER TABLE app.tasks
  RENAME COLUMN space_id TO primary_space_id;

ALTER TABLE app.chats
  RENAME COLUMN space_id TO primary_space_id;

ALTER TABLE app.entities
  RENAME COLUMN space_id TO primary_space_id;

ALTER TABLE app.task_assignments
  RENAME COLUMN space_id TO primary_space_id;

ALTER TABLE app.tasks
  RENAME CONSTRAINT app_tasks_id_space_id_key TO app_tasks_id_primary_space_id_key;

ALTER TABLE app.task_assignments
  RENAME CONSTRAINT app_task_assignments_task_space_fkey TO app_task_assignments_task_primary_space_fkey;

ALTER TABLE app.task_assignments
  RENAME CONSTRAINT app_task_assignments_membership_fkey TO app_task_assignments_primary_space_membership_fkey;

ALTER INDEX app.app_tasks_space_id_idx
  RENAME TO app_tasks_primary_space_id_idx;

ALTER INDEX app.app_chats_space_id_idx
  RENAME TO app_chats_primary_space_id_idx;

ALTER INDEX app.app_entities_space_id_idx
  RENAME TO app_entities_primary_space_id_idx;

CREATE TABLE app.space_items (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  space_id uuid NOT NULL REFERENCES app.spaces(id) ON DELETE CASCADE,
  entity_table regclass NOT NULL,
  entity_id uuid NOT NULL,
  added_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  membership_period tstzrange GENERATED ALWAYS AS (
    tstzrange(added_at, coalesce(removed_at, 'infinity'::timestamptz), '[)')
  ) STORED,
  position numeric(18,6),
  is_pinned boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT app_space_items_entity_fkey
    FOREIGN KEY (entity_table, entity_id)
    REFERENCES app.entities(entity_table, entity_id)
    ON DELETE CASCADE,
  CONSTRAINT app_space_items_removed_after_added_check CHECK (
    removed_at IS NULL OR removed_at >= added_at
  ),
  CONSTRAINT app_space_items_membership_period_not_empty CHECK (
    NOT isempty(membership_period)
  ),
  CONSTRAINT app_space_items_active_window_key UNIQUE (
    space_id,
    entity_table,
    entity_id,
    membership_period WITHOUT OVERLAPS
  )
);

CREATE INDEX app_space_items_space_id_added_at_idx
  ON app.space_items (space_id, added_at DESC);

CREATE INDEX app_space_items_space_id_pinned_position_idx
  ON app.space_items (space_id, is_pinned DESC, position NULLS LAST, added_at DESC);

CREATE INDEX app_space_items_entity_idx
  ON app.space_items (entity_table, entity_id);

CREATE INDEX app_space_items_active_space_idx
  ON app.space_items (space_id, entity_table, entity_id)
  WHERE removed_at IS NULL;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION app.validate_space_item_position()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = app, public
AS $$
DECLARE
  is_space_ordered boolean;
BEGIN
  SELECT space.is_ordered
  INTO is_space_ordered
  FROM app.spaces space
  WHERE space.id = NEW.space_id;

  IF coalesce(is_space_ordered, false) = false AND NEW.position IS NOT NULL THEN
    RAISE EXCEPTION 'position is only allowed for ordered spaces';
  END IF;

  RETURN NEW;
END
$$;
-- +goose StatementEnd

CREATE TRIGGER app_space_items_validate_position
  BEFORE INSERT OR UPDATE ON app.space_items
  FOR EACH ROW
  EXECUTE FUNCTION app.validate_space_item_position();

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.can_access_entity(target_entity_table regclass, target_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.entities entity
    WHERE entity.entity_table = target_entity_table
      AND entity.entity_id = target_entity_id
      AND (
        auth.is_service_role()
        OR entity.owner_userId = auth.current_user_id()
        OR (
          entity.primary_space_id IS NOT NULL
          AND auth.is_space_member(entity.primary_space_id)
        )
        OR EXISTS (
          SELECT 1
          FROM app.space_items item
          WHERE item.entity_table = entity.entity_table
            AND item.entity_id = entity.entity_id
            AND item.membership_period @> now()
            AND auth.is_space_member(item.space_id)
        )
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
            AND share.access_period @> now()
        )
        OR EXISTS (
          SELECT 1
          FROM app.space_items item
          WHERE item.entity_table = 'app.notes'::regclass
            AND item.entity_id = note.id
            AND item.membership_period @> now()
            AND auth.is_space_member(item.space_id)
        )
      )
  )
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION app.sync_entity_registry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, auth, public
AS $$
DECLARE
  entity_owner uuid;
  entity_primary_space uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM app.entities
    WHERE entity_table = TG_RELID
      AND entity_id = OLD.id;

    RETURN OLD;
  END IF;

  entity_owner := CASE
    WHEN TG_NARGS >= 1 AND TG_ARGV[0] <> '' THEN nullif(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid
    ELSE NULL
  END;

  entity_primary_space := CASE
    WHEN TG_NARGS >= 2 AND TG_ARGV[1] <> '' THEN nullif(to_jsonb(NEW) ->> TG_ARGV[1], '')::uuid
    ELSE NULL
  END;

  INSERT INTO app.entities (
    entity_table,
    entity_id,
    owner_userId,
    primary_space_id
  )
  VALUES (
    TG_RELID,
    NEW.id,
    entity_owner,
    entity_primary_space
  )
  ON CONFLICT (entity_table, entity_id) DO UPDATE
  SET
    owner_userId = EXCLUDED.owner_userId,
    primary_space_id = EXCLUDED.primary_space_id,
    updatedAt = now();

  RETURN NEW;
END
$$;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS app_chats_sync_entity_registry ON app.chats;
CREATE TRIGGER app_chats_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.chats
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId', 'primary_space_id');

DROP TRIGGER IF EXISTS app_tasks_sync_entity_registry ON app.tasks;
CREATE TRIGGER app_tasks_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.tasks
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId', 'primary_space_id');

INSERT INTO app.space_items (space_id, entity_table, entity_id, added_by_userId, added_at)
SELECT primary_space_id, 'app.tasks'::regclass, id, owner_userId, createdAt
FROM app.tasks
WHERE primary_space_id IS NOT NULL;

INSERT INTO app.space_items (space_id, entity_table, entity_id, added_by_userId, added_at)
SELECT primary_space_id, 'app.chats'::regclass, id, owner_userId, createdAt
FROM app.chats
WHERE primary_space_id IS NOT NULL;

ALTER TABLE app.space_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.space_items FORCE ROW LEVEL SECURITY;

CREATE POLICY app_space_items_select_policy ON app.space_items
  FOR SELECT
  USING (
    auth.is_service_role()
    OR auth.owns_space(space_id)
    OR auth.is_space_member(space_id)
  );

CREATE POLICY app_space_items_write_policy ON app.space_items
  FOR ALL
  USING (
    auth.is_service_role()
    OR auth.owns_space(space_id)
    OR auth.is_space_member(space_id)
  )
  WITH CHECK (
    auth.is_service_role()
    OR auth.owns_space(space_id)
    OR auth.is_space_member(space_id)
  );

DROP POLICY IF EXISTS app_chats_owner_policy ON app.chats;
CREATE POLICY app_chats_owner_policy ON app.chats
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      primary_space_id IS NOT NULL
      AND auth.is_space_member(primary_space_id)
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      primary_space_id IS NOT NULL
      AND auth.is_space_member(primary_space_id)
    )
  );

DROP POLICY IF EXISTS app_chat_messages_owner_policy ON app.chat_messages;
CREATE POLICY app_chat_messages_owner_policy ON app.chat_messages
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND (
          chat.owner_userId = auth.current_user_id()
          OR (
            chat.primary_space_id IS NOT NULL
            AND auth.is_space_member(chat.primary_space_id)
          )
        )
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND (
          chat.owner_userId = auth.current_user_id()
          OR (
            chat.primary_space_id IS NOT NULL
            AND auth.is_space_member(chat.primary_space_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS app_tasks_select_policy ON app.tasks;
CREATE POLICY app_tasks_select_policy ON app.tasks
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      primary_space_id IS NOT NULL
      AND auth.is_space_member(primary_space_id)
    )
  );

DROP POLICY IF EXISTS app_task_assignments_select_policy ON app.task_assignments;
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
            task.primary_space_id IS NOT NULL
            AND auth.is_space_member(task.primary_space_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS app_task_assignments_owner_write_policy ON app.task_assignments;
CREATE POLICY app_task_assignments_owner_write_policy ON app.task_assignments
  FOR ALL
  USING (
    auth.is_service_role()
    OR auth.owns_space(primary_space_id)
    OR EXISTS (
      SELECT 1
      FROM app.tasks task
      WHERE task.id = task_assignments.task_id
        AND task.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR auth.owns_space(primary_space_id)
    OR EXISTS (
      SELECT 1
      FROM app.tasks task
      WHERE task.id = task_assignments.task_id
        AND task.owner_userId = auth.current_user_id()
    )
  );

DROP POLICY IF EXISTS app_entities_select_policy ON app.entities;
CREATE POLICY app_entities_select_policy ON app.entities
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      primary_space_id IS NOT NULL
      AND auth.is_space_member(primary_space_id)
    )
    OR EXISTS (
      SELECT 1
      FROM app.space_items item
      WHERE item.entity_table = entities.entity_table
        AND item.entity_id = entities.entity_id
        AND item.membership_period @> now()
        AND auth.is_space_member(item.space_id)
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

-- +goose Down
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
    OR EXISTS (
      SELECT 1
      FROM app.entities entity
      WHERE entity.entity_table = tag_assignments.entity_table
        AND entity.entity_id = tag_assignments.entity_id
        AND (
          entity.owner_userId = auth.current_user_id()
          OR (
            entity.primary_space_id IS NOT NULL
            AND auth.is_space_member(entity.primary_space_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS app_entities_select_policy ON app.entities;
CREATE POLICY app_entities_select_policy ON app.entities
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      primary_space_id IS NOT NULL
      AND auth.is_space_member(primary_space_id)
    )
  );

DROP POLICY IF EXISTS app_task_assignments_owner_write_policy ON app.task_assignments;
CREATE POLICY app_task_assignments_owner_write_policy ON app.task_assignments
  FOR ALL
  USING (
    auth.is_service_role()
    OR auth.owns_space(primary_space_id)
    OR EXISTS (
      SELECT 1
      FROM app.tasks task
      WHERE task.id = task_assignments.task_id
        AND task.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR auth.owns_space(primary_space_id)
    OR EXISTS (
      SELECT 1
      FROM app.tasks task
      WHERE task.id = task_assignments.task_id
        AND task.owner_userId = auth.current_user_id()
    )
  );

DROP POLICY IF EXISTS app_task_assignments_select_policy ON app.task_assignments;
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
            task.primary_space_id IS NOT NULL
            AND auth.is_space_member(task.primary_space_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS app_tasks_select_policy ON app.tasks;
CREATE POLICY app_tasks_select_policy ON app.tasks
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      primary_space_id IS NOT NULL
      AND auth.is_space_member(primary_space_id)
    )
  );

DROP POLICY IF EXISTS app_chat_messages_owner_policy ON app.chat_messages;
CREATE POLICY app_chat_messages_owner_policy ON app.chat_messages
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND (
          chat.owner_userId = auth.current_user_id()
          OR (
            chat.primary_space_id IS NOT NULL
            AND auth.is_space_member(chat.primary_space_id)
          )
        )
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND (
          chat.owner_userId = auth.current_user_id()
          OR (
            chat.primary_space_id IS NOT NULL
            AND auth.is_space_member(chat.primary_space_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS app_chats_owner_policy ON app.chats;
CREATE POLICY app_chats_owner_policy ON app.chats
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      primary_space_id IS NOT NULL
      AND auth.is_space_member(primary_space_id)
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      primary_space_id IS NOT NULL
      AND auth.is_space_member(primary_space_id)
    )
  );

DROP POLICY IF EXISTS app_space_items_write_policy ON app.space_items;
DROP POLICY IF EXISTS app_space_items_select_policy ON app.space_items;
ALTER TABLE app.space_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.space_items DISABLE ROW LEVEL SECURITY;

DELETE FROM app.space_items
WHERE entity_table IN ('app.tasks'::regclass, 'app.chats'::regclass);

DROP TRIGGER IF EXISTS app_tasks_sync_entity_registry ON app.tasks;
CREATE TRIGGER app_tasks_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.tasks
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId', 'space_id');

DROP TRIGGER IF EXISTS app_chats_sync_entity_registry ON app.chats;
CREATE TRIGGER app_chats_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.chats
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId', 'space_id');

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION app.sync_entity_registry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, auth, public
AS $$
DECLARE
  entity_owner uuid;
  entity_space uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM app.entities
    WHERE entity_table = TG_RELID
      AND entity_id = OLD.id;

    RETURN OLD;
  END IF;

  entity_owner := CASE
    WHEN TG_NARGS >= 1 AND TG_ARGV[0] <> '' THEN nullif(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid
    ELSE NULL
  END;

  entity_space := CASE
    WHEN TG_NARGS >= 2 AND TG_ARGV[1] <> '' THEN nullif(to_jsonb(NEW) ->> TG_ARGV[1], '')::uuid
    ELSE NULL
  END;

  INSERT INTO app.entities (
    entity_table,
    entity_id,
    owner_userId,
    primary_space_id
  )
  VALUES (
    TG_RELID,
    NEW.id,
    entity_owner,
    entity_space
  )
  ON CONFLICT (entity_table, entity_id) DO UPDATE
  SET
    owner_userId = EXCLUDED.owner_userId,
    primary_space_id = EXCLUDED.primary_space_id,
    updatedAt = now();

  RETURN NEW;
END
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
            AND share.access_period @> now()
        )
      )
  )
$$;
-- +goose StatementEnd

DROP FUNCTION IF EXISTS auth.can_access_entity(regclass, uuid);

DROP TRIGGER IF EXISTS app_space_items_validate_position ON app.space_items;
DROP FUNCTION IF EXISTS app.validate_space_item_position();

DROP INDEX IF EXISTS app.app_space_items_active_space_idx;
DROP INDEX IF EXISTS app.app_space_items_entity_idx;
DROP INDEX IF EXISTS app.app_space_items_space_id_pinned_position_idx;
DROP INDEX IF EXISTS app.app_space_items_space_id_added_at_idx;
DROP TABLE IF EXISTS app.space_items;

ALTER INDEX app.app_entities_primary_space_id_idx
  RENAME TO app_entities_space_id_idx;

ALTER INDEX app.app_chats_primary_space_id_idx
  RENAME TO app_chats_space_id_idx;

ALTER INDEX app.app_tasks_primary_space_id_idx
  RENAME TO app_tasks_space_id_idx;

ALTER TABLE app.task_assignments
  RENAME CONSTRAINT app_task_assignments_primary_space_membership_fkey TO app_task_assignments_membership_fkey;

ALTER TABLE app.task_assignments
  RENAME CONSTRAINT app_task_assignments_task_primary_space_fkey TO app_task_assignments_task_space_fkey;

ALTER TABLE app.tasks
  RENAME CONSTRAINT app_tasks_id_primary_space_id_key TO app_tasks_id_space_id_key;

ALTER TABLE app.task_assignments
  RENAME COLUMN primary_space_id TO space_id;

ALTER TABLE app.entities
  RENAME COLUMN primary_space_id TO space_id;

ALTER TABLE app.chats
  RENAME COLUMN primary_space_id TO space_id;

ALTER TABLE app.tasks
  RENAME COLUMN primary_space_id TO space_id;
