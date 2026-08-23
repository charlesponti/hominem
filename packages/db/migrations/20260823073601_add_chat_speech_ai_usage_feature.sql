-- +goose Up
ALTER TABLE app.ai_usage_events
  DROP CONSTRAINT IF EXISTS app_ai_usage_events_feature_check;

ALTER TABLE app.ai_usage_events
  ADD CONSTRAINT app_ai_usage_events_feature_check
  CHECK (
    feature IN (
      'chat_stream', 'text_enhance', 'task_extract', 'voice_task_extract',
      'time_block_extract', 'voice_cleanup', 'chat_speech', 'embedding',
      'mcp_tool_call', 'career_resume_convert', 'career_resume_customize',
      'career_job_scrape', 'career_skills_derive', 'file_image_analyze',
      'file_document_summarize'
    )
  );

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
  DROP CONSTRAINT IF EXISTS app_ai_usage_events_feature_check;

ALTER TABLE app.ai_usage_events
  ADD CONSTRAINT app_ai_usage_events_feature_check
  CHECK (
    feature IN (
      'chat_stream', 'text_enhance', 'task_extract', 'voice_task_extract',
      'time_block_extract', 'voice_cleanup', 'embedding', 'mcp_tool_call',
      'career_resume_convert', 'career_resume_customize', 'career_job_scrape',
      'career_skills_derive', 'file_image_analyze', 'file_document_summarize'
    )
  );
