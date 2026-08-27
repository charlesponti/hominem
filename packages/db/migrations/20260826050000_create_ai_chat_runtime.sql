-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS app.ai_chat_threads (
  thread_id uuid PRIMARY KEY REFERENCES app.chats(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.ai_chat_messages (
  id text PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES app.ai_chat_threads(thread_id) ON DELETE CASCADE,
  message jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_ai_chat_messages_thread_created_idx
  ON app.ai_chat_messages (thread_id, created_at, id);

CREATE TABLE IF NOT EXISTS app.ai_chat_runs (
  run_id text PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES app.ai_chat_threads(thread_id) ON DELETE CASCADE,
  status text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  error jsonb,
  usage jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_ai_chat_runs_thread_status_idx
  ON app.ai_chat_runs (thread_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS app.ai_chat_interrupts (
  interrupt_id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES app.ai_chat_runs(run_id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES app.ai_chat_threads(thread_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  payload jsonb NOT NULL,
  response jsonb,
  CONSTRAINT app_ai_chat_interrupts_status_check
    CHECK (status IN ('pending', 'resolved', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS app_ai_chat_interrupts_thread_status_idx
  ON app.ai_chat_interrupts (thread_id, status, requested_at);

CREATE TABLE IF NOT EXISTS app.ai_chat_stream_events (
  run_id text NOT NULL REFERENCES app.ai_chat_runs(run_id) ON DELETE CASCADE,
  sequence bigint NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, sequence)
);

CREATE INDEX IF NOT EXISTS app_ai_chat_stream_events_run_sequence_idx
  ON app.ai_chat_stream_events (run_id, sequence);

CREATE TRIGGER app_ai_chat_threads_set_updated_at
  BEFORE UPDATE ON app.ai_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_snake();

CREATE TRIGGER app_ai_chat_messages_set_updated_at
  BEFORE UPDATE ON app.ai_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_snake();

CREATE TRIGGER app_ai_chat_runs_set_updated_at
  BEFORE UPDATE ON app.ai_chat_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_snake();

ALTER TABLE app.ai_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_chat_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE app.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_chat_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE app.ai_chat_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_chat_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE app.ai_chat_interrupts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_chat_interrupts FORCE ROW LEVEL SECURITY;
ALTER TABLE app.ai_chat_stream_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_chat_stream_events FORCE ROW LEVEL SECURITY;

CREATE POLICY app_ai_chat_threads_owner_policy ON app.ai_chat_threads
  FOR ALL USING (auth.is_service_role() OR owner_user_id = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_user_id = auth.current_user_id());

CREATE POLICY app_ai_chat_messages_owner_policy ON app.ai_chat_messages
  FOR ALL USING (
    auth.is_service_role() OR EXISTS (
      SELECT 1 FROM app.ai_chat_threads t
      WHERE t.thread_id = ai_chat_messages.thread_id
        AND t.owner_user_id = auth.current_user_id()
    )
  ) WITH CHECK (
    auth.is_service_role() OR EXISTS (
      SELECT 1 FROM app.ai_chat_threads t
      WHERE t.thread_id = ai_chat_messages.thread_id
        AND t.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_ai_chat_runs_owner_policy ON app.ai_chat_runs
  FOR ALL USING (
    auth.is_service_role() OR EXISTS (
      SELECT 1 FROM app.ai_chat_threads t
      WHERE t.thread_id = ai_chat_runs.thread_id
        AND t.owner_user_id = auth.current_user_id()
    )
  ) WITH CHECK (
    auth.is_service_role() OR EXISTS (
      SELECT 1 FROM app.ai_chat_threads t
      WHERE t.thread_id = ai_chat_runs.thread_id
        AND t.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_ai_chat_interrupts_owner_policy ON app.ai_chat_interrupts
  FOR ALL USING (
    auth.is_service_role() OR EXISTS (
      SELECT 1 FROM app.ai_chat_threads t
      WHERE t.thread_id = ai_chat_interrupts.thread_id
        AND t.owner_user_id = auth.current_user_id()
    )
  ) WITH CHECK (
    auth.is_service_role() OR EXISTS (
      SELECT 1 FROM app.ai_chat_threads t
      WHERE t.thread_id = ai_chat_interrupts.thread_id
        AND t.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_ai_chat_stream_events_owner_policy ON app.ai_chat_stream_events
  FOR ALL USING (
    auth.is_service_role() OR EXISTS (
      SELECT 1
      FROM app.ai_chat_runs r
      JOIN app.ai_chat_threads t ON t.thread_id = r.thread_id
      WHERE r.run_id = ai_chat_stream_events.run_id
        AND t.owner_user_id = auth.current_user_id()
    )
  ) WITH CHECK (
    auth.is_service_role() OR EXISTS (
      SELECT 1
      FROM app.ai_chat_runs r
      JOIN app.ai_chat_threads t ON t.thread_id = r.thread_id
      WHERE r.run_id = ai_chat_stream_events.run_id
        AND t.owner_user_id = auth.current_user_id()
    )
  );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP POLICY IF EXISTS app_ai_chat_stream_events_owner_policy ON app.ai_chat_stream_events;
DROP POLICY IF EXISTS app_ai_chat_interrupts_owner_policy ON app.ai_chat_interrupts;
DROP POLICY IF EXISTS app_ai_chat_runs_owner_policy ON app.ai_chat_runs;
DROP POLICY IF EXISTS app_ai_chat_messages_owner_policy ON app.ai_chat_messages;
DROP POLICY IF EXISTS app_ai_chat_threads_owner_policy ON app.ai_chat_threads;
DROP TABLE IF EXISTS app.ai_chat_stream_events;
DROP TABLE IF EXISTS app.ai_chat_interrupts;
DROP TABLE IF EXISTS app.ai_chat_runs;
DROP TABLE IF EXISTS app.ai_chat_messages;
DROP TRIGGER IF EXISTS app_ai_chat_runs_set_updated_at ON app.ai_chat_runs;
DROP TRIGGER IF EXISTS app_ai_chat_messages_set_updated_at ON app.ai_chat_messages;
DROP TRIGGER IF EXISTS app_ai_chat_threads_set_updated_at ON app.ai_chat_threads;
DROP TABLE IF EXISTS app.ai_chat_threads;
-- +goose StatementEnd
