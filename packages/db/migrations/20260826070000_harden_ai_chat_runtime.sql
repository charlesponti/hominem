-- +goose Up
-- +goose StatementBegin
ALTER TABLE app.ai_chat_runs
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false;

ALTER TABLE app.ai_chat_messages
  ADD COLUMN IF NOT EXISTS source_message_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS app_ai_chat_messages_thread_source_message_idx
  ON app.ai_chat_messages (thread_id, source_message_id)
  WHERE source_message_id IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS app.app_ai_chat_messages_thread_source_message_idx;
ALTER TABLE app.ai_chat_messages DROP COLUMN IF EXISTS source_message_id;
ALTER TABLE app.ai_chat_runs DROP COLUMN IF EXISTS cancel_requested;
-- +goose StatementEnd
