-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.collection_members
  ADD COLUMN user_id text REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE app.collection_members
  ALTER COLUMN person_id DROP NOT NULL;

ALTER TABLE app.collection_members
  DROP CONSTRAINT collection_members_collection_id_person_id_key;

ALTER TABLE app.collection_members
  ADD CONSTRAINT collection_members_collection_id_user_id_key UNIQUE (collection_id, user_id);

CREATE INDEX idx_app_collection_members_user ON app.collection_members(user_id);

ALTER TABLE app.collections
  ADD COLUMN kind text NOT NULL DEFAULT 'generic' CHECK (kind IN ('generic', 'place_list'));

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE app.collections
  DROP COLUMN kind;

DROP INDEX IF EXISTS app.idx_app_collection_members_user;

ALTER TABLE app.collection_members
  DROP CONSTRAINT collection_members_collection_id_user_id_key;

ALTER TABLE app.collection_members
  ADD CONSTRAINT collection_members_collection_id_person_id_key UNIQUE (collection_id, person_id);

ALTER TABLE app.collection_members
  ALTER COLUMN person_id SET NOT NULL;

ALTER TABLE app.collection_members
  DROP COLUMN user_id;

-- +goose StatementEnd
