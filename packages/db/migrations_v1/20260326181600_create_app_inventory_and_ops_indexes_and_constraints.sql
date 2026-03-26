-- +goose Up
ALTER TABLE app.possession_containers
  ADD CONSTRAINT app_possession_containers_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_possession_containers_location_not_blank CHECK (
    location IS NULL OR length(btrim(location)) > 0
  );

ALTER TABLE app.possessions
  ADD CONSTRAINT app_possessions_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_possessions_category_not_blank CHECK (
    category IS NULL OR length(btrim(category)) > 0
  ),
  ADD CONSTRAINT app_possessions_serial_number_not_blank CHECK (
    serial_number IS NULL OR length(btrim(serial_number)) > 0
  ),
  ADD CONSTRAINT app_possessions_price_check CHECK (
    purchase_price IS NULL OR purchase_price >= 0
  ),
  ADD CONSTRAINT app_possessions_current_value_check CHECK (
    current_value IS NULL OR current_value >= 0
  );

ALTER TABLE app.possession_events
  ADD CONSTRAINT app_possession_events_event_type_not_blank CHECK (length(btrim(event_type)) > 0),
  ADD CONSTRAINT app_possession_events_amount_check CHECK (
    amount IS NULL OR amount >= 0
  ),
  ADD CONSTRAINT app_possession_events_date_order_check CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  ),
  ADD CONSTRAINT app_possession_events_amount_unit_not_blank CHECK (
    amount_unit IS NULL OR length(btrim(amount_unit)) > 0
  ),
  ADD CONSTRAINT app_possession_events_method_not_blank CHECK (
    method IS NULL OR length(btrim(method)) > 0
  );

ALTER TABLE ops.audit_logs
  ADD CONSTRAINT ops_audit_logs_action_not_blank CHECK (length(btrim(action)) > 0),
  ADD CONSTRAINT ops_audit_logs_entity_schema_not_blank CHECK (
    entity_schema IS NULL OR length(btrim(entity_schema)) > 0
  ),
  ADD CONSTRAINT ops_audit_logs_entity_table_not_blank CHECK (
    entity_table IS NULL OR length(btrim(entity_table)) > 0
  );

ALTER TABLE ops.search_logs
  ADD CONSTRAINT ops_search_logs_query_not_blank CHECK (length(btrim(query)) > 0),
  ADD CONSTRAINT ops_search_logs_scope_not_blank CHECK (
    scope IS NULL OR length(btrim(scope)) > 0
  ),
  ADD CONSTRAINT ops_search_logs_results_count_check CHECK (
    results_count IS NULL OR results_count >= 0
  ),
  ADD CONSTRAINT ops_search_logs_clicked_entity_type_not_blank CHECK (
    clicked_entity_type IS NULL OR length(btrim(clicked_entity_type)) > 0
  );

ALTER TABLE ops.schema_jobs
  ADD CONSTRAINT ops_schema_jobs_job_name_not_blank CHECK (length(btrim(job_name)) > 0),
  ADD CONSTRAINT ops_schema_jobs_status_check CHECK (
    status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')
  ),
  ADD CONSTRAINT ops_schema_jobs_time_order_check CHECK (
    finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at
  ),
  ADD CONSTRAINT ops_schema_jobs_error_message_not_blank CHECK (
    error_message IS NULL OR length(btrim(error_message)) > 0
  );

CREATE INDEX app_possession_containers_owner_user_id_idx
  ON app.possession_containers (owner_user_id, updated_at DESC);

CREATE INDEX app_possessions_owner_user_id_idx
  ON app.possessions (owner_user_id, updated_at DESC);

CREATE INDEX app_possessions_container_id_idx
  ON app.possessions (container_id);

CREATE UNIQUE INDEX app_possessions_owner_serial_number_key
  ON app.possessions (owner_user_id, serial_number)
  WHERE serial_number IS NOT NULL;

CREATE INDEX app_possession_events_owner_occurred_at_idx
  ON app.possession_events (owner_user_id, occurred_at DESC);

CREATE INDEX app_possession_events_possession_id_idx
  ON app.possession_events (possession_id);

CREATE INDEX app_possession_events_container_id_idx
  ON app.possession_events (container_id)
  WHERE container_id IS NOT NULL;

CREATE INDEX ops_audit_logs_created_at_idx
  ON ops.audit_logs (created_at DESC);

CREATE INDEX ops_audit_logs_actor_created_at_idx
  ON ops.audit_logs (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE INDEX ops_audit_logs_entity_idx
  ON ops.audit_logs (entity_schema, entity_table, entity_id, created_at DESC)
  WHERE entity_id IS NOT NULL;

CREATE INDEX ops_search_logs_created_at_idx
  ON ops.search_logs (created_at DESC);

CREATE INDEX ops_search_logs_actor_created_at_idx
  ON ops.search_logs (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE INDEX ops_search_logs_query_idx
  ON ops.search_logs USING gin (query gin_trgm_ops);

CREATE INDEX ops_schema_jobs_status_created_at_idx
  ON ops.schema_jobs (status, created_at DESC);

CREATE TRIGGER app_possession_containers_set_updated_at
  BEFORE UPDATE ON app.possession_containers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_possessions_set_updated_at
  BEFORE UPDATE ON app.possessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_possession_events_set_updated_at
  BEFORE UPDATE ON app.possession_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ops_schema_jobs_set_updated_at
  BEFORE UPDATE ON ops.schema_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS ops_schema_jobs_set_updated_at ON ops.schema_jobs;
DROP TRIGGER IF EXISTS app_possession_events_set_updated_at ON app.possession_events;
DROP TRIGGER IF EXISTS app_possessions_set_updated_at ON app.possessions;
DROP TRIGGER IF EXISTS app_possession_containers_set_updated_at ON app.possession_containers;

DROP INDEX IF EXISTS ops_schema_jobs_status_created_at_idx;
DROP INDEX IF EXISTS ops_search_logs_query_idx;
DROP INDEX IF EXISTS ops_search_logs_actor_created_at_idx;
DROP INDEX IF EXISTS ops_search_logs_created_at_idx;
DROP INDEX IF EXISTS ops_audit_logs_entity_idx;
DROP INDEX IF EXISTS ops_audit_logs_actor_created_at_idx;
DROP INDEX IF EXISTS ops_audit_logs_created_at_idx;
DROP INDEX IF EXISTS app_possession_events_container_id_idx;
DROP INDEX IF EXISTS app_possession_events_possession_id_idx;
DROP INDEX IF EXISTS app_possession_events_owner_occurred_at_idx;
DROP INDEX IF EXISTS app_possessions_owner_serial_number_key;
DROP INDEX IF EXISTS app_possessions_container_id_idx;
DROP INDEX IF EXISTS app_possessions_owner_user_id_idx;
DROP INDEX IF EXISTS app_possession_containers_owner_user_id_idx;

ALTER TABLE ops.schema_jobs
  DROP CONSTRAINT IF EXISTS ops_schema_jobs_error_message_not_blank,
  DROP CONSTRAINT IF EXISTS ops_schema_jobs_time_order_check,
  DROP CONSTRAINT IF EXISTS ops_schema_jobs_status_check,
  DROP CONSTRAINT IF EXISTS ops_schema_jobs_job_name_not_blank;

ALTER TABLE ops.search_logs
  DROP CONSTRAINT IF EXISTS ops_search_logs_clicked_entity_type_not_blank,
  DROP CONSTRAINT IF EXISTS ops_search_logs_results_count_check,
  DROP CONSTRAINT IF EXISTS ops_search_logs_scope_not_blank,
  DROP CONSTRAINT IF EXISTS ops_search_logs_query_not_blank;

ALTER TABLE ops.audit_logs
  DROP CONSTRAINT IF EXISTS ops_audit_logs_entity_table_not_blank,
  DROP CONSTRAINT IF EXISTS ops_audit_logs_entity_schema_not_blank,
  DROP CONSTRAINT IF EXISTS ops_audit_logs_action_not_blank;

ALTER TABLE app.possession_events
  DROP CONSTRAINT IF EXISTS app_possession_events_method_not_blank,
  DROP CONSTRAINT IF EXISTS app_possession_events_amount_unit_not_blank,
  DROP CONSTRAINT IF EXISTS app_possession_events_date_order_check,
  DROP CONSTRAINT IF EXISTS app_possession_events_amount_check,
  DROP CONSTRAINT IF EXISTS app_possession_events_event_type_not_blank;

ALTER TABLE app.possessions
  DROP CONSTRAINT IF EXISTS app_possessions_current_value_check,
  DROP CONSTRAINT IF EXISTS app_possessions_price_check,
  DROP CONSTRAINT IF EXISTS app_possessions_serial_number_not_blank,
  DROP CONSTRAINT IF EXISTS app_possessions_category_not_blank,
  DROP CONSTRAINT IF EXISTS app_possessions_name_not_blank;

ALTER TABLE app.possession_containers
  DROP CONSTRAINT IF EXISTS app_possession_containers_location_not_blank,
  DROP CONSTRAINT IF EXISTS app_possession_containers_name_not_blank;
