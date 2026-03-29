-- +goose Up
CREATE TABLE app.possession_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  description text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.possessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  container_id uuid REFERENCES app.possession_containers(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  purchase_date date,
  purchase_price numeric(12,2),
  current_value numeric(12,2),
  item_condition text,
  location text,
  serial_number text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.possession_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  possessionId uuid NOT NULL REFERENCES app.possessions(id) ON DELETE CASCADE,
  container_id uuid REFERENCES app.possession_containers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  occurred_at timestamptz,
  amount numeric(12,2),
  amount_unit text,
  method text,
  start_date date,
  end_date date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ops.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_schema text,
  entity_table text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ops.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  query text NOT NULL,
  scope text,
  results_count integer,
  clicked_entity_type text,
  clicked_entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS ops.search_logs;
DROP TABLE IF EXISTS ops.audit_logs;
DROP TABLE IF EXISTS app.possession_events;
DROP TABLE IF EXISTS app.possessions;
DROP TABLE IF EXISTS app.possession_containers;
