-- +goose Up

-- ── Disarm cross-references on staying tables ──────────────────────

-- Drop FK on tag_assignments → entities (entities is going away; the
-- column stays as a regclass-type label, just without the FK).
ALTER TABLE app.tag_assignments
  DROP CONSTRAINT IF EXISTS app_tag_assignments_entity_fkey;

-- Drop entity-registry sync triggers on staying tables (the entities
-- table and the sync_entity_registry function are being removed).
DROP TRIGGER IF EXISTS app_notes_sync_entity_registry ON app.notes;
DROP TRIGGER IF EXISTS app_chats_sync_entity_registry ON app.chats;
DROP TRIGGER IF EXISTS app_tasks_sync_entity_registry ON app.tasks;
DROP TRIGGER IF EXISTS app_finance_accounts_sync_entity_registry ON app.finance_accounts;
DROP TRIGGER IF EXISTS app_finance_transactions_sync_entity_registry ON app.finance_transactions;

-- ── Drop RLS policies on staying tables that reference objects
--    going away (recreated simple below). ─────────────────────────────

DROP POLICY IF EXISTS app_notes_select_policy ON app.notes;
DROP POLICY IF EXISTS app_chats_owner_policy ON app.chats;
DROP POLICY IF EXISTS app_chat_messages_owner_policy ON app.chat_messages;
DROP POLICY IF EXISTS app_tasks_select_policy ON app.tasks;
DROP POLICY IF EXISTS app_tag_assignments_select_policy ON app.tag_assignments;
DROP POLICY IF EXISTS app_tag_assignments_owner_write_policy ON app.tag_assignments;
DROP POLICY IF EXISTS app_tags_shared_select_policy ON app.tags;

-- ── Drop all unused app-schema tables ───────────────────────────────

-- +goose StatementBegin

-- Entity / relational layer
DROP TABLE IF EXISTS app.entity_links CASCADE;
DROP TABLE IF EXISTS app.entity_attributes CASCADE;
DROP TABLE IF EXISTS app.entities CASCADE;

-- Spaces
DROP TABLE IF EXISTS app.space_items CASCADE;
DROP TABLE IF EXISTS app.space_tags CASCADE;
DROP TABLE IF EXISTS app.space_invites CASCADE;
DROP TABLE IF EXISTS app.space_members CASCADE;
DROP TABLE IF EXISTS app.spaces CASCADE;

-- Tags
DROP TABLE IF EXISTS app.tag_aliases CASCADE;

-- Tasks cruft
DROP TABLE IF EXISTS app.task_assignments CASCADE;
DROP TABLE IF EXISTS app.task_external_projections CASCADE;

-- Notes cruft
DROP TABLE IF EXISTS app.note_shares CASCADE;
DROP TABLE IF EXISTS app.note_versions CASCADE;

-- People / communication / social
DROP TABLE IF EXISTS app.person_relationships CASCADE;
DROP TABLE IF EXISTS app.person_contact_methods CASCADE;
DROP TABLE IF EXISTS app.person_aliases CASCADE;
DROP TABLE IF EXISTS app.social_interactions CASCADE;
DROP TABLE IF EXISTS app.communication_messages CASCADE;
DROP TABLE IF EXISTS app.communication_threads CASCADE;
DROP TABLE IF EXISTS app.people CASCADE;

-- Organizations
DROP TABLE IF EXISTS app.organization_memberships CASCADE;
DROP TABLE IF EXISTS app.organizations CASCADE;

-- Places / travel
DROP TABLE IF EXISTS app.place_visits CASCADE;
DROP TABLE IF EXISTS app.travel_segments CASCADE;
DROP TABLE IF EXISTS app.travel_trips CASCADE;
DROP TABLE IF EXISTS app.places CASCADE;

-- Bookmarks
DROP TABLE IF EXISTS app.bookmarks CASCADE;

-- Goals
DROP TABLE IF EXISTS app.key_results CASCADE;
DROP TABLE IF EXISTS app.goals CASCADE;

-- Career (application_files, certifications: no code consumer.
-- career_events and job_application_status_history were mislabeled here —
-- portfolio.repository.ts still queried both directly via raw SQL, so
-- 20260731170000_restore_career_events_and_status_history.sql recreates them.)
DROP TABLE IF EXISTS app.application_files CASCADE;
DROP TABLE IF EXISTS app.career_events CASCADE;
DROP TABLE IF EXISTS app.certifications CASCADE;
DROP TABLE IF EXISTS app.job_application_status_history CASCADE;

-- Finance cruft
DROP TABLE IF EXISTS app.finance_statement_periods CASCADE;
DROP TABLE IF EXISTS app.finance_transaction_postings CASCADE;
DROP TABLE IF EXISTS app.finance_categories CASCADE;
DROP TABLE IF EXISTS app.finance_merchants CASCADE;

-- Media / music / video
DROP TABLE IF EXISTS app.media_consumptions CASCADE;
DROP TABLE IF EXISTS app.media_works CASCADE;
DROP TABLE IF EXISTS app.music_playlist_tracks CASCADE;
DROP TABLE IF EXISTS app.music_listens CASCADE;
DROP TABLE IF EXISTS app.music_playlists CASCADE;
DROP TABLE IF EXISTS app.music_tracks CASCADE;
DROP TABLE IF EXISTS app.music_albums CASCADE;
DROP TABLE IF EXISTS app.music_artists CASCADE;
DROP TABLE IF EXISTS app.video_views CASCADE;
DROP TABLE IF EXISTS app.video_channels CASCADE;

-- Inventory / purchasing
DROP TABLE IF EXISTS app.possession_events CASCADE;
DROP TABLE IF EXISTS app.possessions CASCADE;
DROP TABLE IF EXISTS app.possession_containers CASCADE;
DROP TABLE IF EXISTS app.purchase_line_items CASCADE;
DROP TABLE IF EXISTS app.purchase_orders CASCADE;

-- Portfolio analytics
DROP TABLE IF EXISTS app.portfolio_analytics CASCADE;

-- Extracted facts
DROP TABLE IF EXISTS app.extracted_facts CASCADE;

-- +goose StatementEnd

-- ── Drop orphaned functions ─────────────────────────────────────────

DROP FUNCTION IF EXISTS app.sync_entity_registry();
DROP FUNCTION IF EXISTS app.validate_space_item_position();
DROP FUNCTION IF EXISTS auth.owns_space(uuid);
DROP FUNCTION IF EXISTS auth.is_space_member(uuid);
DROP FUNCTION IF EXISTS auth.can_access_entity(regclass, uuid);
DROP FUNCTION IF EXISTS auth.can_write_note(uuid);
DROP FUNCTION IF EXISTS auth.can_read_tag(uuid);
DROP FUNCTION IF EXISTS auth.is_tag_owner(uuid);

-- ── Update can_read_note to remove note_shares reference ────────────

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
      )
  )
$$;
-- +goose StatementEnd

-- ── Recreate simplified RLS policies on staying tables ──────────────

-- Notes
CREATE POLICY app_notes_select_policy ON app.notes
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  );

-- Chats
CREATE POLICY app_chats_owner_policy ON app.chats
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  );

-- Chat messages
CREATE POLICY app_chat_messages_owner_policy ON app.chat_messages
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND (
          auth.is_service_role()
          OR chat.owner_userId = auth.current_user_id()
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
          auth.is_service_role()
          OR chat.owner_userId = auth.current_user_id()
        )
    )
  );

-- Tasks
CREATE POLICY app_tasks_select_policy ON app.tasks
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  );

-- Tag assignments (simplified: owner via the tag, or service role)
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
  );

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

-- ── Drop unused extension ───────────────────────────────────────────
-- btree_gist was added solely for entity_links GIST indexes
DROP EXTENSION IF EXISTS btree_gist;


-- +goose Down

-- +goose StatementBegin

-- ── Reinstate btree_gist ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── Restore functions that were dropped ─────────────────────────────

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
    entity_table, entity_id, owner_userId, primary_space_id
  )
  VALUES (TG_RELID, NEW.id, entity_owner, entity_primary_space)
  ON CONFLICT (entity_table, entity_id) DO UPDATE
  SET
    owner_userId = EXCLUDED.owner_userId,
    primary_space_id = EXCLUDED.primary_space_id,
    updatedAt = now();

  RETURN NEW;
END
$$;

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

CREATE OR REPLACE FUNCTION auth.owns_space(target_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.spaces space
    WHERE space.id = target_space_id
      AND (auth.is_service_role() OR space.owner_userId = auth.current_user_id())
  )
$$;

CREATE OR REPLACE FUNCTION auth.is_space_member(target_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.space_members member
    WHERE member.space_id = target_space_id
      AND member.membership_period @> now()
      AND (auth.is_service_role() OR member.userId = auth.current_user_id())
  )
$$;

CREATE OR REPLACE FUNCTION auth.can_access_entity(target_entity_table regclass, target_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.entities entity
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
          SELECT 1 FROM app.space_items item
          WHERE item.entity_table = entity.entity_table
            AND item.entity_id = entity.entity_id
            AND item.membership_period @> now()
            AND auth.is_space_member(item.space_id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION auth.can_write_note(target_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.notes note
    WHERE note.id = target_note_id
      AND (auth.is_service_role() OR note.owner_userId = auth.current_user_id())
  )
$$;

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
      SELECT 1 FROM app.space_tags space_tag
      WHERE space_tag.tag_id = target_tag_id
        AND (auth.owns_space(space_tag.space_id) OR auth.is_space_member(space_tag.space_id))
    )
$$;

CREATE OR REPLACE FUNCTION auth.is_tag_owner(target_tag_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.tags tag
    WHERE tag.id = target_tag_id
      AND (auth.is_service_role() OR tag.owner_userId = auth.current_user_id())
  )
$$;

-- ── Recreate can_read_note with note_shares check ───────────────────

CREATE OR REPLACE FUNCTION auth.can_read_note(target_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.notes note
    WHERE note.id = target_note_id
      AND (
        auth.is_service_role()
        OR note.owner_userId = auth.current_user_id()
        OR EXISTS (
          SELECT 1 FROM app.note_shares share
          WHERE share.note_id = note.id
            AND share.shared_with_userId = auth.current_user_id()
            AND share.access_period @> now()
        )
        OR EXISTS (
          SELECT 1 FROM app.space_items item
          WHERE item.entity_table = 'app.notes'::regclass
            AND item.entity_id = note.id
            AND item.membership_period @> now()
            AND auth.is_space_member(item.space_id)
        )
      )
  )
$$;

-- ═══════════════════════════════════════════════════════════════════
-- Recreate all 54 dropped tables (simplified: essential columns only,
-- no code depends on them)
-- ═══════════════════════════════════════════════════════════════════

-- +goose StatementEnd

-- ── Entity registry ─────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.entities (
  entity_table regclass NOT NULL,
  entity_id uuid NOT NULL,
  owner_userId text REFERENCES "user"(id) ON DELETE CASCADE,
  primary_space_id uuid,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_entities_pkey PRIMARY KEY (entity_table, entity_id)
);

CREATE TABLE app.entity_attributes (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  entity_table regclass NOT NULL,
  entity_id uuid NOT NULL,
  namespace text NOT NULL CHECK (length(btrim(namespace)) > 0),
  attribute_key text NOT NULL CHECK (length(btrim(attribute_key)) > 0),
  value jsonb NOT NULL,
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_table, entity_id, namespace, attribute_key)
);

CREATE TABLE app.entity_links (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  space_id uuid,
  from_entity_table regclass NOT NULL,
  from_entity_id uuid NOT NULL,
  relation_type text NOT NULL CHECK (length(btrim(relation_type)) > 0),
  to_entity_table regclass NOT NULL,
  to_entity_id uuid NOT NULL,
  valid_during tstzrange NOT NULL DEFAULT tstzrange(now(), 'infinity'::timestamptz, '[)'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_entity_links_valid_during_not_empty CHECK (NOT isempty(valid_during)),
  CONSTRAINT app_entity_links_distinct_endpoints_check CHECK (
    from_entity_table <> to_entity_table OR from_entity_id <> to_entity_id
  ),
  CONSTRAINT app_entity_links_from_entity_fkey
    FOREIGN KEY (from_entity_table, from_entity_id) REFERENCES app.entities(entity_table, entity_id) ON DELETE CASCADE,
  CONSTRAINT app_entity_links_to_entity_fkey
    FOREIGN KEY (to_entity_table, to_entity_id) REFERENCES app.entities(entity_table, entity_id) ON DELETE CASCADE
);
-- +goose StatementEnd

-- ── Spaces ──────────────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.spaces (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  icon text,
  color text,
  is_ordered boolean NOT NULL DEFAULT false,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.space_members (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  space_id uuid NOT NULL REFERENCES app.spaces(id) ON DELETE CASCADE,
  userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  added_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  membership_period tstzrange NOT NULL DEFAULT tstzrange(now(), 'infinity'::timestamptz, '[)'),
  CONSTRAINT app_space_members_membership_period_not_empty CHECK (NOT isempty(membership_period))
);

CREATE TABLE app.space_invites (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  space_id uuid NOT NULL REFERENCES app.spaces(id) ON DELETE CASCADE,
  inviter_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  invited_user_email text NOT NULL CHECK (length(btrim(invited_user_email)) > 0),
  invited_user_email_normalized text GENERATED ALWAYS AS (lower(invited_user_email)) STORED,
  invited_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  invite_token text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expiresAt timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  revokedAt timestamptz,
  invite_window tstzrange GENERATED ALWAYS AS (
    tstzrange(createdAt, coalesce(accepted_at, revokedAt, expiresAt, 'infinity'::timestamptz), '[)')
  ) STORED,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_space_invites_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  CONSTRAINT app_space_invites_invite_window_not_empty CHECK (NOT isempty(invite_window))
);

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
    FOREIGN KEY (entity_table, entity_id) REFERENCES app.entities(entity_table, entity_id) ON DELETE CASCADE,
  CONSTRAINT app_space_items_entity_space_key UNIQUE (space_id, entity_table, entity_id),
  CONSTRAINT app_space_items_membership_period_not_empty CHECK (NOT isempty(membership_period))
);

CREATE TABLE app.space_tags (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  space_id uuid NOT NULL REFERENCES app.spaces(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES app.tags(id) ON DELETE CASCADE,
  created_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  createdAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Tag aliases ─────────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.tag_aliases (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tag_id uuid NOT NULL REFERENCES app.tags(id) ON DELETE CASCADE,
  alias text NOT NULL CHECK (length(btrim(alias)) > 0),
  alias_slug text NOT NULL CHECK (length(btrim(alias_slug)) > 0),
  createdAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Task cruft ──────────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.task_assignments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  task_id uuid NOT NULL,
  primary_space_id uuid NOT NULL REFERENCES app.spaces(id) ON DELETE CASCADE,
  assignee_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  assigned_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  assignment_period tstzrange NOT NULL DEFAULT tstzrange(now(), 'infinity'::timestamptz, '[)'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_task_assignments_period_not_empty CHECK (NOT isempty(assignment_period)),
  CONSTRAINT app_task_assignments_task_primary_space_fkey
    FOREIGN KEY (task_id, primary_space_id) REFERENCES app.tasks(id, primary_space_id) ON DELETE CASCADE
);

CREATE TABLE app.task_external_projections (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  task_id uuid NOT NULL REFERENCES app.tasks(id) ON DELETE CASCADE,
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (length(btrim(provider)) > 0),
  external_id text NOT NULL CHECK (length(btrim(external_id)) > 0),
  external_list_id text,
  external_updated_at timestamptz,
  last_synced_at timestamptz,
  sync_status text NOT NULL DEFAULT 'pending',
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Note cruft ──────────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.note_versions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  note_id uuid NOT NULL REFERENCES app.notes(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text,
  content text,
  excerpt text,
  note_type text NOT NULL DEFAULT 'default',
  status text NOT NULL DEFAULT 'draft',
  created_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  published_at timestamptz,
  scheduled_for timestamptz,
  publishing_metadata jsonb,
  analysis jsonb,
  mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (note_id, version_number)
);

CREATE TABLE app.note_shares (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  note_id uuid NOT NULL REFERENCES app.notes(id) ON DELETE CASCADE,
  shared_with_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'read',
  granted_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  expiresAt timestamptz,
  revokedAt timestamptz,
  access_period tstzrange GENERATED ALWAYS AS (
    tstzrange(createdAt, coalesce(revokedAt, expiresAt, 'infinity'::timestamptz), '[)')
  ) STORED,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_note_shares_access_period_not_empty CHECK (NOT isempty(access_period))
);
-- +goose StatementEnd

-- ── People / communication / social ─────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.people (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  email text,
  phone text,
  image text,
  person_type text NOT NULL DEFAULT 'external',
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.person_aliases (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  alias text NOT NULL CHECK (length(btrim(alias)) > 0),
  alias_kind text NOT NULL DEFAULT 'nickname',
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.person_contact_methods (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (length(btrim(kind)) > 0),
  value text NOT NULL CHECK (length(btrim(value)) > 0),
  label text,
  is_primary boolean NOT NULL DEFAULT false,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.person_relationships (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  from_person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  to_person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (length(btrim(relationship_type)) > 0),
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.social_interactions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  interaction_type text NOT NULL CHECK (length(btrim(interaction_type)) > 0),
  occurred_at timestamptz NOT NULL,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.communication_threads (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (length(btrim(channel)) > 0),
  title text,
  external_id text,
  sensitivity text NOT NULL DEFAULT 'private',
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.communication_messages (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES app.communication_threads(id) ON DELETE CASCADE,
  sender_person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (length(btrim(direction)) > 0),
  sent_at timestamptz NOT NULL,
  external_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Organizations ───────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.organizations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  kind text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  website_url text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.organization_memberships (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  role text,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Places / travel ─────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.places (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  address text,
  place_type text,
  latitude numeric,
  longitude numeric,
  rating numeric,
  notes text,
  source text,
  external_id text,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.place_visits (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES app.places(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  purpose text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.travel_trips (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.travel_segments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES app.travel_trips(id) ON DELETE CASCADE,
  segment_type text NOT NULL CHECK (length(btrim(segment_type)) > 0),
  origin_place_id uuid REFERENCES app.places(id) ON DELETE SET NULL,
  destination_place_id uuid REFERENCES app.places(id) ON DELETE SET NULL,
  departs_at timestamptz,
  arrives_at timestamptz,
  provider text,
  confirmation_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Bookmarks ───────────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.bookmarks (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  url text NOT NULL CHECK (length(btrim(url)) > 0),
  description text,
  place_id uuid REFERENCES app.places(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Goals ───────────────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.goals (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  status text NOT NULL DEFAULT 'active',
  target_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.key_results (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  goal_id uuid NOT NULL REFERENCES app.goals(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  unit text,
  target_value numeric,
  current_value numeric,
  due_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Career cruft ────────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.career_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
  event_date timestamptz NOT NULL,
  description text,
  work_experience_id uuid,
  previous_title text,
  new_title text,
  previous_salary numeric,
  new_salary numeric,
  salary_increase numeric,
  increase_percentage text,
  previous_total_comp numeric,
  new_total_comp numeric,
  total_comp_increase numeric,
  previous_level text,
  new_level text,
  bonus_amount numeric,
  bonus_type text,
  equity_granted numeric,
  equity_vesting text,
  performance_rating text,
  manager_feedback text,
  self_assessment text,
  market_salary_range jsonb,
  career_goals jsonb,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills_gained jsonb NOT NULL DEFAULT '[]'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.certifications (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  issuing_organization text NOT NULL CHECK (length(btrim(issuing_organization)) > 0),
  issue_date timestamptz NOT NULL,
  expiration_date timestamptz,
  next_renewal_date timestamptz,
  category text,
  description text,
  cost numeric,
  status text NOT NULL DEFAULT 'active',
  is_visible boolean NOT NULL DEFAULT true,
  work_experience_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.job_application_status_history (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  application_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL CHECK (length(btrim(new_status)) > 0),
  changed_at timestamptz NOT NULL DEFAULT now(),
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.application_files (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  application_id uuid NOT NULL,
  file_name text NOT NULL CHECK (length(btrim(file_name)) > 0),
  file_url text,
  file_content text,
  file_size integer,
  mime_type text,
  type text NOT NULL CHECK (length(btrim(type)) > 0),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Finance cruft ───────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.finance_categories (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  kind text NOT NULL DEFAULT 'expense',
  parent_id uuid,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.finance_merchants (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  normalized_name text NOT NULL CHECK (length(btrim(normalized_name)) > 0),
  website_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.finance_statement_periods (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  account_id uuid NOT NULL,
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  starts_on timestamptz NOT NULL,
  ends_on timestamptz NOT NULL,
  opening_balance numeric,
  closing_balance numeric,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.finance_transaction_postings (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  transaction_id uuid NOT NULL,
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id uuid,
  amount numeric NOT NULL,
  currency_code text NOT NULL DEFAULT 'USD',
  category_id uuid,
  memo text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Media / music / video ───────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.media_works (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  work_type text NOT NULL CHECK (length(btrim(work_type)) > 0),
  creators jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.media_consumptions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  media_work_id uuid NOT NULL REFERENCES app.media_works(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in-progress',
  progress numeric,
  rating numeric,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.music_artists (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  external_id text,
  genre text,
  image_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.music_albums (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  artist_id uuid REFERENCES app.music_artists(id) ON DELETE SET NULL,
  artist_name text,
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  external_id text,
  genre text,
  release_date timestamptz,
  album_art_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.music_tracks (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  artist_id uuid REFERENCES app.music_artists(id) ON DELETE SET NULL,
  artist_name text,
  album_id uuid REFERENCES app.music_albums(id) ON DELETE SET NULL,
  album_name text,
  album_art_url text,
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  external_id text,
  genre text,
  track_number integer,
  disc_number integer,
  duration_seconds integer,
  isrc text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.music_playlists (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  external_id text,
  image_url text,
  is_public boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.music_playlist_tracks (
  playlist_id uuid NOT NULL REFERENCES app.music_playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES app.music_tracks(id) ON DELETE CASCADE,
  position integer NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id)
);

CREATE TABLE app.music_listens (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  track_id uuid REFERENCES app.music_tracks(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer,
  completed boolean NOT NULL DEFAULT false,
  context_type text,
  context_id text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.video_channels (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  external_id text,
  handle text,
  description text,
  image text,
  subscriber_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.video_views (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  external_id text,
  channel_id uuid REFERENCES app.video_channels(id) ON DELETE SET NULL,
  channel_name text,
  content_type text NOT NULL CHECK (length(btrim(content_type)) > 0),
  description text,
  thumbnail_url text,
  duration_seconds integer,
  season_number integer,
  episode_number integer,
  watched_at timestamptz NOT NULL,
  watch_time_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Inventory / purchasing ─────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.possession_containers (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  location text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.possessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  location text,
  container_id uuid REFERENCES app.possession_containers(id) ON DELETE SET NULL,
  item_condition text,
  serial_number text,
  purchase_date timestamptz,
  purchase_price numeric,
  current_value numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.possession_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  possessionid uuid NOT NULL REFERENCES app.possessions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (length(btrim(event_type)) > 0),
  amount numeric,
  amount_unit text,
  method text,
  container_id uuid REFERENCES app.possession_containers(id) ON DELETE SET NULL,
  occurred_at timestamptz,
  start_date timestamptz,
  end_date timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.purchase_orders (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES app.finance_merchants(id) ON DELETE SET NULL,
  ordered_at timestamptz,
  total_amount numeric,
  currency_code text NOT NULL DEFAULT 'USD',
  status text,
  source text,
  external_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.purchase_line_items (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES app.purchase_orders(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  quantity numeric NOT NULL DEFAULT 1,
  unit_amount numeric,
  possession_id uuid REFERENCES app.possessions(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Portfolio analytics ─────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.portfolio_analytics (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  portfolio_id uuid NOT NULL,
  event text NOT NULL CHECK (length(btrim(event)) > 0),
  visitor_id text,
  ip_address text,
  user_agent text,
  referer text,
  path text,
  country text,
  city text,
  metadata jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Extracted facts ─────────────────────────────────────────────────

-- +goose StatementBegin
CREATE TABLE app.extracted_facts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  subject_table text,
  subject_id uuid,
  predicate text NOT NULL CHECK (length(btrim(predicate)) > 0),
  object_value jsonb NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  observed_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- ── Reinstate FK on tag_assignments → entities ─────────────────────-

ALTER TABLE app.tag_assignments
  ADD CONSTRAINT app_tag_assignments_entity_fkey
    FOREIGN KEY (entity_table, entity_id)
    REFERENCES app.entities(entity_table, entity_id)
    ON DELETE CASCADE;

-- ── Reinstate entity-registry sync triggers on staying tables ───────

CREATE TRIGGER app_notes_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.notes
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_chats_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.chats
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId', 'primary_space_id');

CREATE TRIGGER app_tasks_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.tasks
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId', 'primary_space_id');

CREATE TRIGGER app_finance_accounts_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.finance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

CREATE TRIGGER app_finance_transactions_sync_entity_registry
  AFTER INSERT OR UPDATE OR DELETE ON app.finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_entity_registry('owner_userId');

-- ── Reinstate RLS policies on staying tables ───────────────────────

DROP POLICY IF EXISTS app_notes_select_policy ON app.notes;
DROP POLICY IF EXISTS app_chats_owner_policy ON app.chats;
DROP POLICY IF EXISTS app_chat_messages_owner_policy ON app.chat_messages;
DROP POLICY IF EXISTS app_tasks_select_policy ON app.tasks;
DROP POLICY IF EXISTS app_tag_assignments_select_policy ON app.tag_assignments;
DROP POLICY IF EXISTS app_tag_assignments_owner_write_policy ON app.tag_assignments;

CREATE POLICY app_notes_select_policy ON app.notes
  FOR SELECT
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id() OR auth.can_read_note(id));

CREATE POLICY app_chats_owner_policy ON app.chats
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (primary_space_id IS NOT NULL AND auth.is_space_member(primary_space_id))
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (primary_space_id IS NOT NULL AND auth.is_space_member(primary_space_id))
  );

CREATE POLICY app_chat_messages_owner_policy ON app.chat_messages
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1 FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND (
          chat.owner_userId = auth.current_user_id()
          OR (chat.primary_space_id IS NOT NULL AND auth.is_space_member(chat.primary_space_id))
        )
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1 FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND (
          chat.owner_userId = auth.current_user_id()
          OR (chat.primary_space_id IS NOT NULL AND auth.is_space_member(chat.primary_space_id))
        )
    )
  );

CREATE POLICY app_tasks_select_policy ON app.tasks
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
    OR (primary_space_id IS NOT NULL AND auth.is_space_member(primary_space_id))
  );

CREATE POLICY app_tag_assignments_select_policy ON app.tag_assignments
  FOR SELECT
  USING (
    auth.is_service_role()
    OR auth.can_read_tag(tag_id)
    OR auth.can_access_entity(entity_table, entity_id)
  );

CREATE POLICY app_tag_assignments_owner_write_policy ON app.tag_assignments
  FOR ALL
  USING (
    auth.is_service_role()
    OR (auth.can_read_tag(tag_id) AND auth.can_access_entity(entity_table, entity_id))
  )
  WITH CHECK (
    auth.is_service_role()
    OR (auth.can_read_tag(tag_id) AND auth.can_access_entity(entity_table, entity_id))
  );

-- ── Enable RLS on recreated tables ──────────────────────────────────

-- +goose StatementBegin
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name IN (
        'entities', 'entity_attributes', 'entity_links',
        'spaces', 'space_members', 'space_invites', 'space_items', 'space_tags',
        'tag_aliases',
        'task_assignments', 'task_external_projections',
        'note_versions', 'note_shares',
        'people', 'person_aliases', 'person_contact_methods', 'person_relationships',
        'social_interactions', 'communication_threads', 'communication_messages',
        'organizations', 'organization_memberships',
        'places', 'place_visits', 'travel_trips', 'travel_segments',
        'bookmarks',
        'goals', 'key_results',
        'career_events', 'certifications', 'job_application_status_history', 'application_files',
        'finance_categories', 'finance_merchants', 'finance_statement_periods', 'finance_transaction_postings',
        'media_works', 'media_consumptions',
        'music_artists', 'music_albums', 'music_tracks', 'music_playlists', 'music_playlist_tracks', 'music_listens',
        'video_channels', 'video_views',
        'possession_containers', 'possessions', 'possession_events',
        'purchase_orders', 'purchase_line_items',
        'portfolio_analytics',
        'extracted_facts'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY; ALTER TABLE app.%I FORCE ROW LEVEL SECURITY;',
      target.table_name, target.table_name
    );

    EXECUTE format(
      'CREATE POLICY app_%I_owner_policy ON app.%I FOR ALL USING (auth.is_service_role() OR owner_userId = auth.current_user_id()) WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id())',
      target.table_name, target.table_name
    );
  END LOOP;
END
$$;
-- +goose StatementEnd
