-- +goose Up
-- +goose StatementBegin
UPDATE app.chat_generation_events event
SET payload = jsonb_set(
  event.payload,
  '{metadata,assistantMessage}',
  jsonb_build_object(
    'id', message.id::text,
    'chatId', message.chat_id::text,
    'userId', coalesce(message.author_userid, run.owner_user_id),
    'role', message.role,
    'content', message.content,
    'files', message.files,
    'toolCalls', message.tool_calls,
    'reasoning', message.reasoning,
    'parentMessageId', message.parent_message_id::text,
    'createdAt', to_jsonb(message.createdat),
    'updatedAt', to_jsonb(message.updatedat)
  )
)
FROM app.chat_generation_runs run
JOIN app.chat_messages message ON true
WHERE run.id = event.generation_id
  AND message.id = nullif(event.payload->'metadata'->'assistantMessage'->>'id', '')::uuid
  AND event.type IN ('generation.committed', 'generation.cancelled', 'generation.failed')
  AND jsonb_typeof(event.payload->'metadata'->'assistantMessage') = 'object'
  AND NOT (event.payload->'metadata'->'assistantMessage' ? 'userId');
-- +goose StatementEnd

-- +goose Down
-- This migration only backfills durable snapshots; it is intentionally irreversible.
