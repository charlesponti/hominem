-- +goose Up
ALTER TABLE app.ai_usage_events
  DROP CONSTRAINT IF EXISTS ai_usage_events_operation_check,
  DROP CONSTRAINT IF EXISTS app_ai_usage_events_operation_check;

ALTER TABLE app.ai_usage_events
  ADD CONSTRAINT ai_usage_events_operation_check
  CHECK (operation IN ('chat_completion', 'structured_output', 'embedding', 'speech'));

UPDATE app.chat_speech_runs AS runs
SET reconciliation_status = 'pending',
    reconciliation_attempts = 0,
    last_reconciliation_error = NULL
WHERE runs.reconciliation_status = 'failed'
  AND runs.provider_generation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM app.ai_usage_events AS events
    WHERE events.id = runs.usage_event_id
  );

-- +goose Down
ALTER TABLE app.ai_usage_events
  DROP CONSTRAINT IF EXISTS ai_usage_events_operation_check,
  DROP CONSTRAINT IF EXISTS app_ai_usage_events_operation_check;

ALTER TABLE app.ai_usage_events
  ADD CONSTRAINT ai_usage_events_operation_check
  CHECK (operation IN ('chat_completion', 'structured_output', 'embedding'));
