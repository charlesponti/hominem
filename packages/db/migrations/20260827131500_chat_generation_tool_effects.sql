-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS app.chat_generation_tool_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES app.chat_generation_runs(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  tool_name text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_chat_generation_tool_effects_key_unique UNIQUE (generation_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS app_chat_generation_tool_effects_generation_idx
  ON app.chat_generation_tool_effects (generation_id, created_at);

ALTER TABLE app.chat_generation_tool_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_generation_tool_effects FORCE ROW LEVEL SECURITY;

CREATE POLICY app_chat_generation_tool_effects_owner_policy
  ON app.chat_generation_tool_effects
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chat_generation_runs run
      JOIN app.chats chat ON chat.id = run.chat_id
      WHERE run.id = chat_generation_tool_effects.generation_id
        AND chat.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chat_generation_runs run
      JOIN app.chats chat ON chat.id = run.chat_id
      WHERE run.id = chat_generation_tool_effects.generation_id
        AND chat.owner_userId = auth.current_user_id()
    )
  );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP POLICY IF EXISTS app_chat_generation_tool_effects_owner_policy
  ON app.chat_generation_tool_effects;
ALTER TABLE IF EXISTS app.chat_generation_tool_effects NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app.chat_generation_tool_effects DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS app.app_chat_generation_tool_effects_generation_idx;
DROP TABLE IF EXISTS app.chat_generation_tool_effects;
-- +goose StatementEnd
