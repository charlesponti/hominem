-- +goose Up
-- +goose StatementBegin

DROP TABLE IF EXISTS app.purchase_returns;
DROP TABLE IF EXISTS app.purchase_line_items;
DROP TABLE IF EXISTS app.purchase_orders;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DO $$
BEGIN
  RAISE EXCEPTION '20260811200000_drop_app_purchase_tables is irreversible; restore the verified SQLite archive before recreating the tables.';
END
$$;

-- +goose StatementEnd
