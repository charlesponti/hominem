-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.collection_members (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES app.collections(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (collection_id, person_id)
);
CREATE INDEX idx_app_collection_members_collection ON app.collection_members(collection_id);
CREATE INDEX idx_app_collection_members_person ON app.collection_members(person_id);

CREATE POLICY app_collection_members_owner_policy ON app.collection_members
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS app.collection_members;

-- +goose StatementEnd
