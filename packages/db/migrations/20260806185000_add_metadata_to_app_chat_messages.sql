-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.chat_messages ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE app.chat_messages DROP COLUMN IF EXISTS metadata;

-- +goose StatementEnd
