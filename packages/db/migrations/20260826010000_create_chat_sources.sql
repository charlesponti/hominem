-- +goose Up
-- +goose StatementBegin
ALTER TABLE app.chat_messages
  DROP COLUMN IF EXISTS referenced_note_ids;

CREATE TABLE IF NOT EXISTS app.chat_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES app.chats(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES app.notes(id) ON DELETE CASCADE,
  added_by_userid text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_chat_sources_chat_note_key UNIQUE (chat_id, note_id)
);

CREATE INDEX IF NOT EXISTS app_chat_sources_chat_id_idx
  ON app.chat_sources (chat_id, created_at DESC);

ALTER TABLE app.chat_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_sources FORCE ROW LEVEL SECURITY;

CREATE POLICY app_chat_sources_owner_policy ON app.chat_sources
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_sources.chat_id
        AND chat.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_sources.chat_id
        AND chat.owner_userId = auth.current_user_id()
    )
  );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP POLICY IF EXISTS app_chat_sources_owner_policy ON app.chat_sources;
ALTER TABLE IF EXISTS app.chat_sources NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app.chat_sources DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS app.app_chat_sources_chat_id_idx;
DROP TABLE IF EXISTS app.chat_sources;

ALTER TABLE app.chat_messages
  ADD COLUMN IF NOT EXISTS referenced_note_ids jsonb;
-- +goose StatementEnd
