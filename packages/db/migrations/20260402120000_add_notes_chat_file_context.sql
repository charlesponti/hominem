-- +goose Up
ALTER TABLE app.notes
  ADD COLUMN title text,
  ADD COLUMN content text NOT NULL DEFAULT '',
  ADD COLUMN excerpt text;

UPDATE app.notes note
SET
  title = version.title,
  content = COALESCE(version.content, ''),
  excerpt = version.excerpt
FROM app.note_versions version
WHERE version.id = note.current_version_id;

CREATE TABLE app.files (
  id uuid PRIMARY KEY,
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  original_name text NOT NULL,
  mimetype text NOT NULL,
  size integer NOT NULL,
  url text NOT NULL,
  content text,
  text_content text,
  metadata jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.note_files (
  note_id uuid NOT NULL REFERENCES app.notes(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES app.files(id) ON DELETE CASCADE,
  attached_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, file_id)
);

ALTER TABLE app.chat_messages
  ADD COLUMN referenced_note_ids jsonb;

CREATE INDEX app_files_owner_userId_idx
  ON app.files (owner_userId, createdAt DESC);

CREATE INDEX app_note_files_note_id_idx
  ON app.note_files (note_id, attached_at DESC);

CREATE INDEX app_note_files_file_id_idx
  ON app.note_files (file_id);

CREATE INDEX app_notes_title_idx
  ON app.notes (owner_userId, title);

CREATE TRIGGER app_files_set_updated_at
  BEFORE UPDATE ON app.files
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS app_files_set_updated_at ON app.files;
DROP INDEX IF EXISTS app.app_notes_title_idx;
DROP INDEX IF EXISTS app.app_note_files_file_id_idx;
DROP INDEX IF EXISTS app.app_note_files_note_id_idx;
DROP INDEX IF EXISTS app.app_files_owner_userId_idx;
ALTER TABLE app.chat_messages DROP COLUMN IF EXISTS referenced_note_ids;
DROP TABLE IF EXISTS app.note_files;
DROP TABLE IF EXISTS app.files;
ALTER TABLE app.notes
  DROP COLUMN IF EXISTS excerpt,
  DROP COLUMN IF EXISTS content,
  DROP COLUMN IF EXISTS title;
