-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.chats ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE app.chats DROP COLUMN IF EXISTS metadata;

-- +goose StatementEnd
