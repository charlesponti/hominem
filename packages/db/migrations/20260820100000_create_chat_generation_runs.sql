-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS app.chat_generation_runs (
  id uuid PRIMARY KEY,
  chat_id uuid NOT NULL REFERENCES app.chats(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind text NOT NULL,
  status text NOT NULL,
  user_message_id uuid REFERENCES app.chat_messages(id) ON DELETE SET NULL,
  target_assistant_message_id uuid REFERENCES app.chat_messages(id) ON DELETE SET NULL,
  assistant_message_id uuid REFERENCES app.chat_messages(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_chat_generation_runs_kind_check
    CHECK (kind IN ('send', 'start', 'regenerate')),
  CONSTRAINT app_chat_generation_runs_status_check
    CHECK (status IN ('preparing', 'saving', 'committed', 'cancelled', 'failed')),
  CONSTRAINT app_chat_generation_runs_target_check
    CHECK (
      (kind = 'regenerate' AND target_assistant_message_id IS NOT NULL)
      OR (kind <> 'regenerate' AND target_assistant_message_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS app_chat_generation_runs_chat_id_status_idx
  ON app.chat_generation_runs (chat_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS app_chat_generation_runs_owner_user_id_idx
  ON app.chat_generation_runs (owner_user_id, created_at DESC);

CREATE TRIGGER app_chat_generation_runs_set_updated_at
  BEFORE UPDATE ON app.chat_generation_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_snake();

ALTER TABLE app.chat_generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_generation_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY app_chat_generation_runs_owner_policy ON app.chat_generation_runs
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_generation_runs.chat_id
        AND chat.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_generation_runs.chat_id
        AND chat.owner_userId = auth.current_user_id()
    )
  );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS app_chat_generation_runs_set_updated_at ON app.chat_generation_runs;
DROP POLICY IF EXISTS app_chat_generation_runs_owner_policy ON app.chat_generation_runs;
ALTER TABLE IF EXISTS app.chat_generation_runs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app.chat_generation_runs DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS app.app_chat_generation_runs_owner_user_id_idx;
DROP INDEX IF EXISTS app.app_chat_generation_runs_chat_id_status_idx;
DROP TABLE IF EXISTS app.chat_generation_runs;
-- +goose StatementEnd
