-- +goose Up
-- +goose StatementBegin
ALTER TABLE app.chat_generation_events
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS app_chat_generation_events_idempotency_key_idx
  ON app.chat_generation_events (generation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_chat_generation_events_terminal_idx
  ON app.chat_generation_events (generation_id, type)
  WHERE type IN ('generation.committed', 'generation.cancelled', 'generation.failed');

ALTER TABLE app.chat_generation_runs
  ADD COLUMN IF NOT EXISTS encrypted_snapshot text;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE app.chat_generation_runs DROP COLUMN IF EXISTS encrypted_snapshot;
DROP INDEX IF EXISTS app.app_chat_generation_events_idempotency_key_idx;
DROP INDEX IF EXISTS app.app_chat_generation_events_terminal_idx;
ALTER TABLE app.chat_generation_events DROP COLUMN IF EXISTS idempotency_key;
-- +goose StatementEnd
