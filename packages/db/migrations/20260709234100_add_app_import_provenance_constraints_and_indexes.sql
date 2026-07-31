-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.import_sources
  ADD CONSTRAINT app_import_sources_provider_not_blank CHECK (length(btrim(provider)) > 0),
  ADD CONSTRAINT app_import_sources_source_kind_not_blank CHECK (length(btrim(source_kind)) > 0),
  ADD CONSTRAINT app_import_sources_display_name_not_blank CHECK (length(btrim(display_name)) > 0),
  ADD CONSTRAINT app_import_sources_external_account_id_not_blank CHECK (
    external_account_id IS NULL OR length(btrim(external_account_id)) > 0
  ),
  ADD CONSTRAINT app_import_sources_status_check CHECK (
    status IN ('active', 'paused', 'needs_attention', 'revoked')
  );

ALTER TABLE app.import_runs
  ADD CONSTRAINT app_import_runs_status_check CHECK (
    status IN ('pending', 'running', 'completed', 'completed_with_warnings', 'failed', 'cancelled')
  ),
  ADD CONSTRAINT app_import_runs_record_counts_nonnegative_check CHECK (
    records_read >= 0 AND records_imported >= 0 AND records_rejected >= 0
  ),
  ADD CONSTRAINT app_import_runs_completed_after_started_check CHECK (
    completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
  );

ALTER TABLE app.import_records
  ADD CONSTRAINT app_import_records_external_id_not_blank CHECK (length(btrim(external_id)) > 0),
  ADD CONSTRAINT app_import_records_record_type_not_blank CHECK (length(btrim(record_type)) > 0),
  ADD CONSTRAINT app_import_records_content_hash_not_blank CHECK (length(btrim(content_hash)) > 0),
  ADD CONSTRAINT app_import_records_raw_object_key_not_blank CHECK (
    raw_object_key IS NULL OR length(btrim(raw_object_key)) > 0
  );

ALTER TABLE app.entity_source_records
  ADD CONSTRAINT app_entity_source_records_mapping_kind_check CHECK (
    mapping_kind IN ('primary', 'derived', 'reviewed')
  ),
  ADD CONSTRAINT app_entity_source_records_confidence_range_check CHECK (
    confidence IS NULL OR confidence >= 0 AND confidence <= 1
  );

ALTER TABLE app.import_review_items
  ADD CONSTRAINT app_import_review_items_review_kind_not_blank CHECK (length(btrim(review_kind)) > 0),
  ADD CONSTRAINT app_import_review_items_status_check CHECK (
    status IN ('pending', 'accepted', 'rejected', 'superseded')
  ),
  ADD CONSTRAINT app_import_review_items_reviewed_at_check CHECK (
    reviewed_at IS NULL OR reviewed_at >= createdAt
  );

CREATE UNIQUE INDEX app_import_sources_owner_provider_account_key
  ON app.import_sources (owner_userId, provider, external_account_id)
  WHERE external_account_id IS NOT NULL;

CREATE INDEX app_import_sources_owner_status_idx
  ON app.import_sources (owner_userId, status);

CREATE INDEX app_import_runs_source_created_idx
  ON app.import_runs (source_id, createdAt DESC);

CREATE INDEX app_import_runs_active_idx
  ON app.import_runs (source_id, started_at DESC)
  WHERE status IN ('pending', 'running');

CREATE UNIQUE INDEX app_import_records_source_external_content_key
  ON app.import_records (source_id, external_id, content_hash);

CREATE INDEX app_import_records_source_occurred_idx
  ON app.import_records (source_id, occurred_at DESC)
  WHERE occurred_at IS NOT NULL;

CREATE INDEX app_import_records_run_idx
  ON app.import_records (import_run_id);

CREATE UNIQUE INDEX app_entity_source_records_source_entity_key
  ON app.entity_source_records (source_record_id, canonical_entity_table, canonical_entity_id);

CREATE INDEX app_entity_source_records_entity_idx
  ON app.entity_source_records (canonical_entity_table, canonical_entity_id);

CREATE INDEX app_import_review_items_pending_idx
  ON app.import_review_items (createdAt ASC)
  WHERE status = 'pending';

CREATE INDEX app_import_review_items_source_record_idx
  ON app.import_review_items (source_record_id);

CREATE TRIGGER app_import_sources_set_updated_at
  BEFORE UPDATE ON app.import_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_import_runs_set_updated_at
  BEFORE UPDATE ON app.import_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_entity_source_records_set_updated_at
  BEFORE UPDATE ON app.entity_source_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_import_review_items_set_updated_at
  BEFORE UPDATE ON app.import_review_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TRIGGER IF EXISTS app_import_review_items_set_updated_at ON app.import_review_items;
DROP TRIGGER IF EXISTS app_entity_source_records_set_updated_at ON app.entity_source_records;
DROP TRIGGER IF EXISTS app_import_runs_set_updated_at ON app.import_runs;
DROP TRIGGER IF EXISTS app_import_sources_set_updated_at ON app.import_sources;

DROP INDEX IF EXISTS app.app_import_review_items_source_record_idx;
DROP INDEX IF EXISTS app.app_import_review_items_pending_idx;
DROP INDEX IF EXISTS app.app_entity_source_records_entity_idx;
DROP INDEX IF EXISTS app.app_entity_source_records_source_entity_key;
DROP INDEX IF EXISTS app.app_import_records_run_idx;
DROP INDEX IF EXISTS app.app_import_records_source_occurred_idx;
DROP INDEX IF EXISTS app.app_import_records_source_external_content_key;
DROP INDEX IF EXISTS app.app_import_runs_active_idx;
DROP INDEX IF EXISTS app.app_import_runs_source_created_idx;
DROP INDEX IF EXISTS app.app_import_sources_owner_status_idx;
DROP INDEX IF EXISTS app.app_import_sources_owner_provider_account_key;

ALTER TABLE app.import_review_items
  DROP CONSTRAINT IF EXISTS app_import_review_items_reviewed_at_check,
  DROP CONSTRAINT IF EXISTS app_import_review_items_status_check,
  DROP CONSTRAINT IF EXISTS app_import_review_items_review_kind_not_blank;

ALTER TABLE app.entity_source_records
  DROP CONSTRAINT IF EXISTS app_entity_source_records_confidence_range_check,
  DROP CONSTRAINT IF EXISTS app_entity_source_records_mapping_kind_check;

ALTER TABLE app.import_records
  DROP CONSTRAINT IF EXISTS app_import_records_raw_object_key_not_blank,
  DROP CONSTRAINT IF EXISTS app_import_records_content_hash_not_blank,
  DROP CONSTRAINT IF EXISTS app_import_records_record_type_not_blank,
  DROP CONSTRAINT IF EXISTS app_import_records_external_id_not_blank;

ALTER TABLE app.import_runs
  DROP CONSTRAINT IF EXISTS app_import_runs_completed_after_started_check,
  DROP CONSTRAINT IF EXISTS app_import_runs_record_counts_nonnegative_check,
  DROP CONSTRAINT IF EXISTS app_import_runs_status_check;

ALTER TABLE app.import_sources
  DROP CONSTRAINT IF EXISTS app_import_sources_status_check,
  DROP CONSTRAINT IF EXISTS app_import_sources_external_account_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_import_sources_display_name_not_blank,
  DROP CONSTRAINT IF EXISTS app_import_sources_source_kind_not_blank,
  DROP CONSTRAINT IF EXISTS app_import_sources_provider_not_blank;

-- +goose StatementEnd
