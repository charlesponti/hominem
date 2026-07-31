-- +goose Up
-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'app' AND table_name = 'notes' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE app.notes ADD COLUMN archived_at timestamptz;
  END IF;
END $$;
-- +goose StatementEnd

CREATE INDEX IF NOT EXISTS app_notes_archived_at_idx
  ON app.notes (owner_userId, archived_at)
  WHERE archived_at IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS app.app_notes_archived_at_idx;
ALTER TABLE app.notes DROP COLUMN IF EXISTS archived_at;
