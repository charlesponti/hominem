-- +goose Up

CREATE TYPE app.career_offer_decision AS ENUM (
  'PENDING',
  'NEGOTIATING',
  'ACCEPTED',
  'DECLINED'
);

ALTER TABLE app.career_application_stages
  ADD COLUMN stage_order INTEGER;

WITH ordered_stages AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY application_id
      ORDER BY entered_at ASC NULLS LAST, created_at ASC, id ASC
    )::integer AS stage_order
  FROM app.career_application_stages
)
UPDATE app.career_application_stages AS stage
SET stage_order = ordered_stages.stage_order
FROM ordered_stages
WHERE stage.id = ordered_stages.id;

ALTER TABLE app.career_application_stages
  ALTER COLUMN stage_order SET NOT NULL,
  ADD CONSTRAINT career_application_stages_order_positive CHECK (stage_order > 0);

CREATE UNIQUE INDEX idx_career_application_stages_application_order
  ON app.career_application_stages(application_id, stage_order);

ALTER TABLE app.career_applications_offers
  ADD COLUMN stage_id UUID REFERENCES app.career_application_stages(id) ON DELETE RESTRICT;

CREATE INDEX idx_career_applications_offers_stage
  ON app.career_applications_offers(stage_id);

ALTER TABLE app.career_applications_offers
  DROP CONSTRAINT IF EXISTS career_applications_offers_decision_check,
  DROP CONSTRAINT IF EXISTS career_applications_offers_decision_check1;

ALTER TABLE app.career_applications_offers
  ALTER COLUMN decision TYPE app.career_offer_decision
    USING CASE lower(coalesce(decision, 'pending'))
      WHEN 'pending' THEN 'PENDING'::app.career_offer_decision
      WHEN 'negotiating' THEN 'NEGOTIATING'::app.career_offer_decision
      WHEN 'accepted' THEN 'ACCEPTED'::app.career_offer_decision
      WHEN 'declined' THEN 'DECLINED'::app.career_offer_decision
    END,
  ALTER COLUMN decision SET DEFAULT 'PENDING',
  ALTER COLUMN decision SET NOT NULL,
  ALTER COLUMN application_id SET NOT NULL,
  ALTER COLUMN stage_id SET NOT NULL;

-- +goose Down

ALTER TABLE app.career_applications_offers
  ALTER COLUMN decision DROP NOT NULL,
  ALTER COLUMN decision DROP DEFAULT,
  ALTER COLUMN decision TYPE TEXT USING decision::text;

DROP INDEX app.idx_career_applications_offers_stage;

ALTER TABLE app.career_applications_offers
  DROP COLUMN stage_id;

DROP INDEX app.idx_career_application_stages_application_order;

ALTER TABLE app.career_application_stages
  DROP CONSTRAINT career_application_stages_order_positive,
  DROP COLUMN stage_order;

DROP TYPE app.career_offer_decision;
