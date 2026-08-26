-- +goose Up
-- +goose StatementBegin
-- chats.metadata / chat_messages.metadata: added by
-- 20260806185100/20260806185000, never read or written by any repository,
-- route, or worker code since.
ALTER TABLE app.chats DROP COLUMN IF EXISTS metadata;
ALTER TABLE app.chat_messages DROP COLUMN IF EXISTS metadata;

-- chats.note_id: ChatRepository.create() accepted it, but no schema ever
-- exposed a way to set it via the API, and ChatRepository.getByNoteId (the
-- only lookup by it) had zero callers. Web's "linked note" UI reads a
-- separate ?noteId= URL param instead, bypassing this column entirely.
DROP INDEX IF EXISTS app.app_chats_note_id_idx;
ALTER TABLE app.chats DROP COLUMN IF EXISTS note_id;

-- chats.source: had a not-blank check constraint but zero readers or
-- writers anywhere in services/api or either app (unlike app.notes.source,
-- which is load-bearing for the "memories" feature -- verified no
-- equivalent exists for chats).
ALTER TABLE app.chats DROP CONSTRAINT IF EXISTS app_chats_source_not_blank;
ALTER TABLE app.chats DROP COLUMN IF EXISTS source;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE app.chats
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS note_id uuid REFERENCES app.notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE app.chats
  ADD CONSTRAINT app_chats_source_not_blank CHECK (source IS NULL OR length(btrim(source)) > 0);

CREATE INDEX IF NOT EXISTS app_chats_note_id_idx
  ON app.chats (note_id);

ALTER TABLE app.chat_messages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
-- +goose StatementEnd
