-- +goose Up
CREATE TABLE app.entities (
  entity_table regclass NOT NULL,
  entity_id uuid NOT NULL,
  owner_userId text REFERENCES "user"(id) ON DELETE CASCADE,
  space_id uuid REFERENCES app.spaces(id) ON DELETE SET NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_entities_pkey PRIMARY KEY (entity_table, entity_id)
);

CREATE INDEX app_entities_owner_userId_idx
  ON app.entities (owner_userId)
  WHERE owner_userId IS NOT NULL;

CREATE INDEX app_entities_space_id_idx
  ON app.entities (space_id)
  WHERE space_id IS NOT NULL;

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
    space_id
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
    space_id = EXCLUDED.space_id,
    updatedAt = now();

  RETURN NEW;
END
$$;
-- +goose StatementEnd

CREATE TRIGGER app_notes_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.notes
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_chats_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.chats
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_people_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.people
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_spaces_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.spaces
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_tasks_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.tasks
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId', 'space_id');

CREATE TRIGGER app_goals_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.goals
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_places_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.places
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_bookmarks_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_events_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.events
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_travel_trips_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.travel_trips
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_finance_accounts_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.finance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_finance_transactions_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_music_artists_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.music_artists
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_music_albums_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.music_albums
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_music_tracks_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.music_tracks
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_music_playlists_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.music_playlists
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_video_channels_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.video_channels
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_possessions_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.possessions
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.notes'::regclass, id, owner_userId, NULL
FROM app.notes
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.chats'::regclass, id, owner_userId, space_id
FROM app.chats
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.people'::regclass, id, owner_userId, NULL
FROM app.people
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.spaces'::regclass, id, owner_userId, NULL
FROM app.spaces
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.tasks'::regclass, id, owner_userId, space_id
FROM app.tasks
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.goals'::regclass, id, owner_userId, NULL
FROM app.goals
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.places'::regclass, id, owner_userId, NULL
FROM app.places
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.bookmarks'::regclass, id, owner_userId, NULL
FROM app.bookmarks
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.events'::regclass, id, owner_userId, NULL
FROM app.events
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.travel_trips'::regclass, id, owner_userId, NULL
FROM app.travel_trips
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.finance_accounts'::regclass, id, owner_userId, NULL
FROM app.finance_accounts
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.finance_transactions'::regclass, id, owner_userId, NULL
FROM app.finance_transactions
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.music_artists'::regclass, id, owner_userId, NULL
FROM app.music_artists
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.music_albums'::regclass, id, owner_userId, NULL
FROM app.music_albums
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.music_tracks'::regclass, id, owner_userId, NULL
FROM app.music_tracks
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.music_playlists'::regclass, id, owner_userId, NULL
FROM app.music_playlists
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.video_channels'::regclass, id, owner_userId, NULL
FROM app.video_channels
ON CONFLICT DO NOTHING;

INSERT INTO app.entities (entity_table, entity_id, owner_userId, space_id)
SELECT 'app.possessions'::regclass, id, owner_userId, NULL
FROM app.possessions
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS app_tag_assignments_select_policy ON app.tag_assignments;

DROP INDEX IF EXISTS app.app_tag_assignments_entity_idx;

ALTER TABLE app.tag_assignments
  DROP CONSTRAINT IF EXISTS tag_assignments_entity_type_not_null,
  DROP CONSTRAINT IF EXISTS app_tag_assignments_tag_entity_key,
  DROP CONSTRAINT IF EXISTS app_tag_assignments_entity_type_not_blank,
  ADD COLUMN entity_table regclass;

UPDATE app.tag_assignments
SET entity_table = CASE entity_type
  WHEN 'note' THEN 'app.notes'::regclass
  WHEN 'task' THEN 'app.tasks'::regclass
  WHEN 'person' THEN 'app.people'::regclass
  WHEN 'chat' THEN 'app.chats'::regclass
  WHEN 'bookmark' THEN 'app.bookmarks'::regclass
  WHEN 'place' THEN 'app.places'::regclass
  ELSE 'app.notes'::regclass
END
WHERE entity_table IS NULL;

ALTER TABLE app.tag_assignments
  ALTER COLUMN entity_table SET NOT NULL,
  DROP COLUMN entity_type,
  ADD CONSTRAINT app_tag_assignments_entity_fkey
    FOREIGN KEY (entity_table, entity_id)
    REFERENCES app.entities(entity_table, entity_id)
    ON DELETE CASCADE,
  ADD CONSTRAINT app_tag_assignments_tag_entity_key UNIQUE (tag_id, entity_table, entity_id);

CREATE INDEX app_tag_assignments_entity_idx
  ON app.tag_assignments (entity_table, entity_id);

ALTER TABLE app.entity_links
  ADD CONSTRAINT app_entity_links_from_entity_fkey
    FOREIGN KEY (from_entity_table, from_entity_id)
    REFERENCES app.entities(entity_table, entity_id)
    ON DELETE CASCADE,
  ADD CONSTRAINT app_entity_links_to_entity_fkey
    FOREIGN KEY (to_entity_table, to_entity_id)
    REFERENCES app.entities(entity_table, entity_id)
    ON DELETE CASCADE;

ALTER TABLE app.entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_entities_select_policy ON app.entities
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (
      space_id IS NOT NULL
      AND auth.is_space_member(space_id)
    )
  );

CREATE POLICY app_entities_service_write_policy ON app.entities
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

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
            entity.space_id IS NOT NULL
            AND auth.is_space_member(entity.space_id)
          )
        )
    )
  );

-- +goose Down
DROP POLICY IF EXISTS app_entities_service_write_policy ON app.entities;
DROP POLICY IF EXISTS app_entities_select_policy ON app.entities;
ALTER TABLE app.entities DISABLE ROW LEVEL SECURITY;

ALTER TABLE app.entity_links
  DROP CONSTRAINT IF EXISTS app_entity_links_to_entity_fkey,
  DROP CONSTRAINT IF EXISTS app_entity_links_from_entity_fkey;

DROP POLICY IF EXISTS app_tag_assignments_owner_write_policy ON app.tag_assignments;
DROP POLICY IF EXISTS app_tag_assignments_select_policy ON app.tag_assignments;

DROP INDEX IF EXISTS app.app_tag_assignments_entity_idx;

ALTER TABLE app.tag_assignments
  DROP CONSTRAINT IF EXISTS tag_assignments_entity_table_not_null,
  DROP CONSTRAINT IF EXISTS app_tag_assignments_entity_fkey,
  DROP CONSTRAINT IF EXISTS app_tag_assignments_tag_entity_key,
  ADD COLUMN entity_type text;

UPDATE app.tag_assignments
SET entity_type = CASE entity_table
  WHEN 'app.notes'::regclass THEN 'note'
  WHEN 'app.tasks'::regclass THEN 'task'
  WHEN 'app.people'::regclass THEN 'person'
  WHEN 'app.chats'::regclass THEN 'chat'
  WHEN 'app.bookmarks'::regclass THEN 'bookmark'
  WHEN 'app.places'::regclass THEN 'place'
  ELSE 'note'
END
WHERE entity_type IS NULL;

ALTER TABLE app.tag_assignments
  ALTER COLUMN entity_type SET NOT NULL,
  DROP COLUMN entity_table,
  ADD CONSTRAINT app_tag_assignments_entity_type_not_blank CHECK (length(btrim(entity_type)) > 0),
  ADD CONSTRAINT app_tag_assignments_tag_entity_key UNIQUE (tag_id, entity_type, entity_id);

CREATE INDEX app_tag_assignments_entity_idx
  ON app.tag_assignments (entity_type, entity_id);

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
    OR (
      entity_type = 'note'
      AND auth.can_read_note(entity_id)
    )
  );

DROP TRIGGER IF EXISTS app_possessions_sync_entity_registry ON app.possessions;
DROP TRIGGER IF EXISTS app_video_channels_sync_entity_registry ON app.video_channels;
DROP TRIGGER IF EXISTS app_music_playlists_sync_entity_registry ON app.music_playlists;
DROP TRIGGER IF EXISTS app_music_tracks_sync_entity_registry ON app.music_tracks;
DROP TRIGGER IF EXISTS app_music_albums_sync_entity_registry ON app.music_albums;
DROP TRIGGER IF EXISTS app_music_artists_sync_entity_registry ON app.music_artists;
DROP TRIGGER IF EXISTS app_finance_transactions_sync_entity_registry ON app.finance_transactions;
DROP TRIGGER IF EXISTS app_finance_accounts_sync_entity_registry ON app.finance_accounts;
DROP TRIGGER IF EXISTS app_travel_trips_sync_entity_registry ON app.travel_trips;
DROP TRIGGER IF EXISTS app_events_sync_entity_registry ON app.events;
DROP TRIGGER IF EXISTS app_bookmarks_sync_entity_registry ON app.bookmarks;
DROP TRIGGER IF EXISTS app_places_sync_entity_registry ON app.places;
DROP TRIGGER IF EXISTS app_goals_sync_entity_registry ON app.goals;
DROP TRIGGER IF EXISTS app_tasks_sync_entity_registry ON app.tasks;
DROP TRIGGER IF EXISTS app_spaces_sync_entity_registry ON app.spaces;
DROP TRIGGER IF EXISTS app_people_sync_entity_registry ON app.people;
DROP TRIGGER IF EXISTS app_chats_sync_entity_registry ON app.chats;
DROP TRIGGER IF EXISTS app_notes_sync_entity_registry ON app.notes;

DROP FUNCTION IF EXISTS app.sync_entity_registry();

DROP INDEX IF EXISTS app.app_entities_space_id_idx;
DROP INDEX IF EXISTS app.app_entities_list_id_idx;
DROP INDEX IF EXISTS app.app_entities_owner_userId_idx;
DROP TABLE IF EXISTS app.entities;
