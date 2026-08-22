-- +goose Up
CREATE TABLE app.chat_speech_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES app.chat_messages(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  usage_event_id uuid NOT NULL,
  provider text NOT NULL,
  provider_generation_id text,
  character_count integer NOT NULL CHECK (character_count >= 0),
  status text NOT NULL DEFAULT 'pending',
  reconciliation_status text NOT NULL DEFAULT 'pending',
  reconciliation_attempts integer NOT NULL DEFAULT 0 CHECK (reconciliation_attempts >= 0),
  last_reconciliation_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_chat_speech_runs_status_check
    CHECK (status IN ('pending', 'succeeded', 'failed')),
  CONSTRAINT app_chat_speech_runs_reconciliation_status_check
    CHECK (reconciliation_status IN ('pending', 'succeeded', 'failed'))
);

CREATE UNIQUE INDEX app_chat_speech_runs_provider_generation_idx
  ON app.chat_speech_runs (provider, provider_generation_id)
  WHERE provider_generation_id IS NOT NULL;

CREATE INDEX app_chat_speech_runs_message_created_idx
  ON app.chat_speech_runs (message_id, created_at DESC);

CREATE INDEX app_chat_speech_runs_owner_created_idx
  ON app.chat_speech_runs (owner_user_id, created_at DESC);

CREATE INDEX app_chat_speech_runs_reconciliation_idx
  ON app.chat_speech_runs (reconciliation_status, created_at ASC)
  WHERE reconciliation_status = 'pending';

CREATE TRIGGER app_chat_speech_runs_set_updated_at
  BEFORE UPDATE ON app.chat_speech_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_snake();

ALTER TABLE app.chat_speech_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_speech_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY app_chat_speech_runs_owner_policy ON app.chat_speech_runs
  FOR ALL
  USING (auth.is_service_role() OR owner_user_id = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_user_id = auth.current_user_id());

-- +goose Down
DROP TRIGGER IF EXISTS app_chat_speech_runs_set_updated_at ON app.chat_speech_runs;
DROP POLICY IF EXISTS app_chat_speech_runs_owner_policy ON app.chat_speech_runs;
ALTER TABLE IF EXISTS app.chat_speech_runs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app.chat_speech_runs DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS app.app_chat_speech_runs_reconciliation_idx;
DROP INDEX IF EXISTS app.app_chat_speech_runs_owner_created_idx;
DROP INDEX IF EXISTS app.app_chat_speech_runs_message_created_idx;
DROP INDEX IF EXISTS app.app_chat_speech_runs_provider_generation_idx;
DROP TABLE IF EXISTS app.chat_speech_runs;
