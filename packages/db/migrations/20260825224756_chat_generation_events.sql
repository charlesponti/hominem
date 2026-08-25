-- +goose Up
-- +goose StatementBegin
ALTER TABLE app.chat_generation_runs
  DROP CONSTRAINT app_chat_generation_runs_status_check,
  ADD CONSTRAINT app_chat_generation_runs_status_check
    CHECK (status IN (
      'preparing', 'queued', 'running', 'cancel_requested', 'awaiting_confirmation',
      'saving', 'committed', 'cancelled', 'failed'
    ));

ALTER TABLE app.chat_generation_runs
  ADD COLUMN IF NOT EXISTS request_context jsonb;

CREATE TABLE IF NOT EXISTS app.chat_generation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES app.chat_generation_runs(id) ON DELETE CASCADE,
  sequence bigint NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_chat_generation_events_sequence_unique UNIQUE (generation_id, sequence)
);

CREATE INDEX IF NOT EXISTS app_chat_generation_events_generation_sequence_idx
  ON app.chat_generation_events (generation_id, sequence);

CREATE TRIGGER app_chat_generation_events_set_updated_at
  BEFORE UPDATE ON app.chat_generation_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_snake();

ALTER TABLE app.chat_generation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_generation_events FORCE ROW LEVEL SECURITY;

CREATE POLICY app_chat_generation_events_owner_policy ON app.chat_generation_events
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chat_generation_runs run
      JOIN app.chats chat ON chat.id = run.chat_id
      WHERE run.id = chat_generation_events.generation_id
        AND chat.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chat_generation_runs run
      JOIN app.chats chat ON chat.id = run.chat_id
      WHERE run.id = chat_generation_events.generation_id
        AND chat.owner_userId = auth.current_user_id()
    )
  );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP POLICY IF EXISTS app_chat_generation_events_owner_policy ON app.chat_generation_events;
ALTER TABLE IF EXISTS app.chat_generation_events NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app.chat_generation_events DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS app_chat_generation_events_set_updated_at ON app.chat_generation_events;
DROP INDEX IF EXISTS app.app_chat_generation_events_generation_sequence_idx;
DROP TABLE IF EXISTS app.chat_generation_events;

ALTER TABLE app.chat_generation_runs DROP COLUMN IF EXISTS request_context;
ALTER TABLE app.chat_generation_runs
  DROP CONSTRAINT app_chat_generation_runs_status_check,
  ADD CONSTRAINT app_chat_generation_runs_status_check
    CHECK (status IN ('preparing', 'saving', 'committed', 'cancelled', 'failed'));
-- +goose StatementEnd
