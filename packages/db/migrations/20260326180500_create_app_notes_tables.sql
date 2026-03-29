-- +goose Up
CREATE TABLE app.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  parent_note_id uuid REFERENCES app.notes(id) ON DELETE SET NULL,
  current_version_id uuid,
  source text,
  is_locked boolean NOT NULL DEFAULT false,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.note_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES app.notes(id) ON DELETE CASCADE,
  created_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  version_number integer NOT NULL,
  title text,
  content text,
  excerpt text,
  note_type text NOT NULL DEFAULT 'note',
  status text NOT NULL DEFAULT 'draft',
  mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis jsonb,
  publishing_metadata jsonb,
  published_at timestamptz,
  scheduled_for timestamptz,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.note_versions
  ADD CONSTRAINT app_note_versions_note_id_id_key UNIQUE (note_id, id);

ALTER TABLE app.notes
  ADD CONSTRAINT app_notes_id_current_version_id_fkey
  FOREIGN KEY (id, current_version_id) REFERENCES app.note_versions(note_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE app.note_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES app.notes(id) ON DELETE CASCADE,
  shared_with_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'read',
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  description text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES app.tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  assigned_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  note_id uuid REFERENCES app.notes(id) ON DELETE SET NULL,
  title text NOT NULL,
  source text,
  archived_at timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES app.chats(id) ON DELETE CASCADE,
  author_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  parent_message_id uuid,
  role text NOT NULL,
  content text NOT NULL,
  files jsonb,
  tool_calls jsonb,
  reasoning text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS app.chat_messages;
DROP TABLE IF EXISTS app.chats;
DROP TABLE IF EXISTS app.tag_assignments;
DROP TABLE IF EXISTS app.tags;
DROP TABLE IF EXISTS app.note_shares;
ALTER TABLE app.notes DROP CONSTRAINT IF EXISTS app_notes_id_current_version_id_fkey;
DROP TABLE IF EXISTS app.note_versions;
DROP TABLE IF EXISTS app.notes;
