-- +goose Up
-- +goose StatementBegin
-- Drop RLS policies
DROP POLICY IF EXISTS app_portfolio_stats_owner_write_policy ON app.portfolio_stats;
DROP POLICY IF EXISTS app_portfolio_stats_select_policy ON app.portfolio_stats;

-- Drop trigger
DROP TRIGGER IF EXISTS app_portfolio_stats_set_updated_at ON app.portfolio_stats;

-- Drop indexes
DROP INDEX IF EXISTS app.app_portfolio_stats_portfolio_sort_idx;
DROP INDEX IF EXISTS app.app_portfolio_stats_sort_order_idx;
DROP INDEX IF EXISTS app.app_portfolio_stats_portfolio_id_idx;

-- Drop constraints
ALTER TABLE app.portfolio_stats
  DROP CONSTRAINT IF EXISTS app_portfolio_stats_sort_order_check,
  DROP CONSTRAINT IF EXISTS app_portfolio_stats_value_not_blank,
  DROP CONSTRAINT IF EXISTS app_portfolio_stats_label_not_blank;

-- Disable RLS before dropping table
ALTER TABLE app.portfolio_stats DISABLE ROW LEVEL SECURITY;

-- Drop table
DROP TABLE IF EXISTS app.portfolio_stats;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Recreate table
CREATE TABLE app.portfolio_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES app.portfolios(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

-- Add constraints
ALTER TABLE app.portfolio_stats
  ADD CONSTRAINT app_portfolio_stats_label_not_blank CHECK (length(btrim(label)) > 0),
  ADD CONSTRAINT app_portfolio_stats_value_not_blank CHECK (length(btrim(value)) > 0),
  ADD CONSTRAINT app_portfolio_stats_sort_order_check CHECK (sort_order >= 0);

-- Recreate indexes
CREATE INDEX app_portfolio_stats_portfolio_id_idx
  ON app.portfolio_stats (portfolio_id);

CREATE INDEX app_portfolio_stats_sort_order_idx
  ON app.portfolio_stats (sort_order);

CREATE INDEX app_portfolio_stats_portfolio_sort_idx
  ON app.portfolio_stats (portfolio_id, sort_order);

-- Recreate trigger
CREATE TRIGGER app_portfolio_stats_set_updated_at
  BEFORE UPDATE ON app.portfolio_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable RLS and create policies
ALTER TABLE app.portfolio_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_portfolio_stats_select_policy ON app.portfolio_stats
  FOR SELECT
  USING (auth.can_read_portfolio(portfolio_id));

CREATE POLICY app_portfolio_stats_owner_write_policy ON app.portfolio_stats
  FOR ALL
  USING (auth.is_portfolio_owner(portfolio_id))
  WITH CHECK (auth.is_portfolio_owner(portfolio_id));
-- +goose StatementEnd
