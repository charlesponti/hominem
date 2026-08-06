-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.collections (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_collections_owner ON app.collections(owner_userId);
CREATE TRIGGER app_collections_set_updated_at
  BEFORE UPDATE ON app.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE app.collection_items (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES app.collections(id) ON DELETE CASCADE,
  entity_table regclass NOT NULL,
  entity_id uuid NOT NULL,
  note text,
  sort_order integer,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, entity_table, entity_id)
);
CREATE INDEX idx_app_collection_items_collection ON app.collection_items(collection_id);
CREATE INDEX idx_app_collection_items_entity ON app.collection_items(entity_table, entity_id);

CREATE POLICY app_collections_owner_policy ON app.collections
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_collection_items_owner_policy ON app.collection_items
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS app.collection_items;
DROP TABLE IF EXISTS app.collections;

-- +goose StatementEnd
