-- +goose Up
-- +goose StatementBegin
-- app.tag_assignments.assignment_period is a stored generated column
-- (tstzrange(createdat, coalesce(removed_at, 'infinity'))) added in
-- 20260326182300_enrich_tag_model.sql. A repo-wide audit found no reader or
-- writer: no query, repository, RPC route, or MCP tool references it. It only
-- adds a write-cost on every tag assignment insert/update, so it goes.
--
-- The other publishing-era columns (tags.description/icon/created_by_userid,
-- tag_assignments.assigned_by_userid/confidence) are NOT dropped here: the
-- finance Copilot import pipeline (packages/finance/src/import/
-- apply-import-plan.ts) writes them, even though nothing reads them back.
-- They stay until the write-only surface is decided on.
ALTER TABLE app.tag_assignments
  DROP COLUMN IF EXISTS assignment_period;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE app.tag_assignments
  ADD COLUMN IF NOT EXISTS assignment_period tstzrange
    GENERATED ALWAYS AS (
      tstzrange(createdat, COALESCE(removed_at, 'infinity'::timestamptz), '[)')
    ) STORED;
-- +goose StatementEnd