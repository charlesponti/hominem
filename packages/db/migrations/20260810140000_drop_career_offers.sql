-- +goose Up

DROP TABLE IF EXISTS app.career_offers;

-- +goose Down

ALTER TABLE app.career_applications_offers
  RENAME TO career_offers;

ALTER INDEX IF EXISTS app.idx_career_applications_offers_app
  RENAME TO idx_career_offers_app;

ALTER POLICY career_applications_offers_owner ON app.career_offers
  RENAME TO career_offers_owner;
