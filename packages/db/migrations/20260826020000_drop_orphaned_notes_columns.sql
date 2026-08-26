-- +goose Up
-- +goose StatementBegin
-- app.note_versions was already dropped in 20260728200105_cleanup_unused_tables.sql
-- (an abandoned versioning system), but app.notes.current_version_id and
-- .is_locked were left behind. Neither column has been read or written by
-- any repository or RPC code since -- see AGENTS.md decision authority notes
-- for the audit that found this.
ALTER TABLE app.notes
  DROP COLUMN IF EXISTS current_version_id,
  DROP COLUMN IF EXISTS is_locked;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE app.notes
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
-- +goose StatementEnd
