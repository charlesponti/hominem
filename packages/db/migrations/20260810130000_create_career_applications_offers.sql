-- +goose Up

CREATE TABLE app.career_applications_offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID REFERENCES app.career_applications(id) ON DELETE CASCADE,
  base_salary     INTEGER,
  equity          TEXT,
  bonus           INTEGER,
  signing_bonus   INTEGER,
  total_comp      INTEGER,
  currency        TEXT DEFAULT 'USD',
  decision        TEXT CHECK(decision IN ('accepted','declined','negotiating',NULL)),
  decision_at     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_applications_offers_app
  ON app.career_applications_offers(application_id);

ALTER TABLE app.career_applications_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_applications_offers_owner ON app.career_applications_offers
  USING (auth.is_service_role() OR
    EXISTS (
      SELECT 1 FROM app.career_applications
      WHERE career_applications.id = career_applications_offers.application_id
      AND career_applications.owner_userId = auth.current_user_id()
    )
  );

-- +goose Down

DROP TABLE IF EXISTS app.career_applications_offers;
