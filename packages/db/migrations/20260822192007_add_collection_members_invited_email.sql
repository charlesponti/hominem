-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.collection_members
  ADD COLUMN invited_email text;

ALTER TABLE app.collection_members
  ADD CONSTRAINT collection_members_identity_check
  CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL);

CREATE UNIQUE INDEX idx_app_collection_members_invited_email
  ON app.collection_members(collection_id, invited_email)
  WHERE invited_email IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS app.idx_app_collection_members_invited_email;

ALTER TABLE app.collection_members
  DROP CONSTRAINT collection_members_identity_check;

ALTER TABLE app.collection_members
  DROP COLUMN invited_email;

-- +goose StatementEnd
