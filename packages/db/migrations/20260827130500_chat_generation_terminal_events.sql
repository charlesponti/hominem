-- +goose Up
-- +goose StatementBegin
CREATE UNIQUE INDEX IF NOT EXISTS app_chat_generation_events_terminal_idx
  ON app.chat_generation_events (generation_id, type)
  WHERE type IN ('generation.committed', 'generation.cancelled', 'generation.failed');
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS app.app_chat_generation_events_terminal_idx;
-- +goose StatementEnd
