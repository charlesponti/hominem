-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.collections
  DROP COLUMN kind;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE app.collections
  ADD COLUMN kind text NOT NULL DEFAULT 'generic'
  CHECK (kind IN ('generic', 'place_list'));

-- +goose StatementEnd
