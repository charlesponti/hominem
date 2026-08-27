-- +goose Up
-- +goose StatementBegin
-- Write-only tag columns: description/icon/created_by_userid on app.tags and
-- assigned_by_userid/confidence on app.tag_assignments were written only by
-- the finance Copilot import pipeline and categories.ts, and read by nothing.
-- The vestigial writes are removed in packages/finance (apply-import-plan.ts,
-- categories.ts); these columns and their dependent FK/check constraints and
-- the partial assigned_by_userid index now go (see
-- docs/features/notes-as-nodes.md, Decision 4).
ALTER TABLE app.tags
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS icon,
  DROP COLUMN IF EXISTS created_by_userid;

ALTER TABLE app.tag_assignments
  DROP COLUMN IF EXISTS assigned_by_userid,
  DROP COLUMN IF EXISTS confidence;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE app.tags
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS created_by_userid text REFERENCES "user"(id) ON DELETE SET NULL;

ALTER TABLE app.tag_assignments
  ADD COLUMN IF NOT EXISTS assigned_by_userid text REFERENCES "user"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence numeric(4,3);

CREATE INDEX IF NOT EXISTS app_tag_assignments_assigned_by_userid_idx
  ON app.tag_assignments (assigned_by_userid)
  WHERE assigned_by_userid IS NOT NULL;

ALTER TABLE app.tag_assignments
  ADD CONSTRAINT app_tag_assignments_confidence_range_check CHECK (
    confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
  );
-- +goose StatementEnd