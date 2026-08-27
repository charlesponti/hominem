-- +goose Up
-- +goose StatementBegin
-- Note node kind: notes are nodes with typed identity. `source` was a
-- free-text provenance column, used exclusively as the 'memory' discriminant
-- by the memory MCP/RPC surfaces. Add the typed `kind` column, backfill it
-- from the existing sentinel, then drop `source` — a one-value column with no
-- remaining readers (see docs/features/notes-as-nodes.md).
ALTER TABLE app.notes
  ADD COLUMN kind text NOT NULL DEFAULT 'note';

UPDATE app.notes SET kind = 'memory' WHERE source = 'memory';

ALTER TABLE app.notes
  ADD CONSTRAINT app_notes_kind_check CHECK (kind IN ('note', 'memory'));

ALTER TABLE app.notes
  DROP COLUMN IF EXISTS source;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE app.notes
  ADD COLUMN IF NOT EXISTS source text;

UPDATE app.notes SET source = 'memory' WHERE kind = 'memory';

ALTER TABLE app.notes
  ADD CONSTRAINT app_notes_source_not_blank CHECK (source IS NULL OR length(btrim(source)) > 0);

ALTER TABLE app.notes
  DROP COLUMN IF EXISTS kind;
-- +goose StatementEnd