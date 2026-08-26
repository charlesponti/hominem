-- +goose Up
-- +goose StatementBegin
-- parent_note_id: column, FK, and index existed since the notes table was
-- created, but no schema ever exposed it for create, no children endpoint
-- exists, and no UI reads it -- pure scaffolding for note nesting that was
-- never built.
DROP INDEX IF EXISTS app.app_notes_parent_note_id_idx;
ALTER TABLE app.notes
  DROP COLUMN IF EXISTS parent_note_id;

-- archived_at: read/filtered in every list/search/feed query, but the only
-- writers (NoteRepository.archive/unarchive) had zero callers anywhere in
-- the repo -- the filter could never trigger. Notes use real hard delete
-- instead; there is no archive concept in either app's UI for notes
-- (unlike chats, which have a real, separate archive feature).
DROP INDEX IF EXISTS app.app_notes_archived_at_idx;
ALTER TABLE app.notes
  DROP COLUMN IF EXISTS archived_at;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE app.notes
  ADD COLUMN IF NOT EXISTS parent_note_id uuid REFERENCES app.notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS app_notes_parent_note_id_idx
  ON app.notes (parent_note_id);

CREATE INDEX IF NOT EXISTS app_notes_archived_at_idx
  ON app.notes (owner_userId, archived_at)
  WHERE archived_at IS NOT NULL;
-- +goose StatementEnd
