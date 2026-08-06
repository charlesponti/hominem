-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.possessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  possession_type text,
  brand text,
  model text,
  sub_category text,
  status text CHECK (status IS NULL OR status IN ('in_use', 'owned', 'wishlist', 'disposed', 'retired')),
  is_archived boolean NOT NULL DEFAULT false,
  acquired_date date,
  retired_date date,
  price_cents integer,
  sell_price_cents integer,
  net_value_cents integer,
  serial_number text,
  size text,
  color text,
  placement text,
  url text,
  notes text,
  artist_person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  art_medium text,
  art_movement text,
  art_period text,
  art_dimensions text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CHECK (retired_date IS NULL OR acquired_date IS NULL OR retired_date >= acquired_date)
);
CREATE INDEX idx_app_possessions_owner ON app.possessions(owner_userId);
CREATE INDEX idx_app_possessions_type ON app.possessions(owner_userId, possession_type)
  WHERE possession_type IS NOT NULL;
CREATE INDEX idx_app_possessions_artist ON app.possessions(artist_person_id)
  WHERE artist_person_id IS NOT NULL;
CREATE TRIGGER app_possessions_set_updated_at
  BEFORE UPDATE ON app.possessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE app.possession_images (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  possession_id uuid NOT NULL REFERENCES app.possessions(id) ON DELETE CASCADE,
  path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  alt_text text,
  original_filename text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (possession_id, display_order)
);
CREATE INDEX idx_app_possession_images_possession ON app.possession_images(possession_id);

CREATE TABLE app.purchase_orders (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  merchant text NOT NULL,
  external_order_id text,
  ordered_at timestamptz,
  status text,
  currency_code text NOT NULL DEFAULT 'USD',
  total_amount numeric(14,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (owner_userId, merchant, external_order_id)
);
CREATE INDEX idx_app_purchase_orders_owner ON app.purchase_orders(owner_userId);
CREATE INDEX idx_app_purchase_orders_merchant ON app.purchase_orders(owner_userId, merchant);
CREATE TRIGGER app_purchase_orders_set_updated_at
  BEFORE UPDATE ON app.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE app.purchase_line_items (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES app.purchase_orders(id) ON DELETE CASCADE,
  possession_id uuid REFERENCES app.possessions(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text,
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit_amount numeric(14,2),
  serial_number text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_purchase_line_items_order ON app.purchase_line_items(purchase_order_id);
CREATE INDEX idx_app_purchase_line_items_possession ON app.purchase_line_items(possession_id)
  WHERE possession_id IS NOT NULL;
CREATE TRIGGER app_purchase_line_items_set_updated_at
  BEFORE UPDATE ON app.purchase_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE app.purchase_returns (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES app.purchase_orders(id) ON DELETE CASCADE,
  return_date date,
  return_amount numeric(14,2),
  currency_code text NOT NULL DEFAULT 'USD',
  reason text,
  resolution text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_purchase_returns_order ON app.purchase_returns(purchase_order_id);

CREATE POLICY app_possessions_owner_policy ON app.possessions
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_possession_images_owner_policy ON app.possession_images
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_purchase_orders_owner_policy ON app.purchase_orders
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_purchase_line_items_owner_policy ON app.purchase_line_items
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_purchase_returns_owner_policy ON app.purchase_returns
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS app.purchase_returns;
DROP TABLE IF EXISTS app.purchase_line_items;
DROP TABLE IF EXISTS app.purchase_orders;
DROP TABLE IF EXISTS app.possession_images;
DROP TABLE IF EXISTS app.possessions;

-- +goose StatementEnd
