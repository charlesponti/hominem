-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION pg_temp.chat_snapshot(snapshot_id uuid, fallback_user_id text)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'id', m.id::text,
    'chatId', m.chat_id::text,
    'userId', coalesce(m.author_userid, fallback_user_id),
    'role', m.role,
    'content', m.content,
    'files', m.files,
    'toolCalls', m.tool_calls,
    'reasoning', m.reasoning,
    'parentMessageId', m.parent_message_id::text,
    'createdAt', to_jsonb(m.createdat),
    'updatedAt', to_jsonb(m.updatedat)
  )
  FROM app.chat_messages m
  WHERE m.id = snapshot_id;
$$;

CREATE OR REPLACE FUNCTION pg_temp.chat_record_snapshot(chat_id uuid)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'id', c.id::text,
    'userId', c.owner_userid,
    'title', c.title,
    'archivedAt', to_jsonb(c.archived_at),
    'createdAt', to_jsonb(c.createdat),
    'updatedAt', to_jsonb(c.updatedat)
  )
  FROM app.chats c
  WHERE c.id = chat_id;
$$;

UPDATE app.chat_generation_events event
SET payload = CASE event.type
  WHEN 'generation.accepted' THEN
    event.payload
      || jsonb_build_object('chat', pg_temp.chat_record_snapshot(run.chat_id))
      || CASE
        WHEN jsonb_typeof(event.payload->'userMessage') = 'object'
          AND NOT (event.payload->'userMessage' ? 'userId')
        THEN jsonb_build_object(
          'userMessage', coalesce(
            pg_temp.chat_snapshot(
              nullif(event.payload->'userMessage'->>'id', '')::uuid,
              run.owner_user_id
            ),
            event.payload->'userMessage'
          )
        )
        ELSE '{}'::jsonb
      END
  WHEN 'generation.checkpointed' THEN
    jsonb_set(
      event.payload,
      '{checkpoint,assistantMessage}',
      coalesce(
        pg_temp.chat_snapshot(
          nullif(event.payload->'checkpoint'->'assistantMessage'->>'id', '')::uuid,
          run.owner_user_id
        ),
        event.payload->'checkpoint'->'assistantMessage'
      )
    )
  WHEN 'generation.committed' THEN
    jsonb_set(
      event.payload,
      '{message}',
      coalesce(
        pg_temp.chat_snapshot(
          nullif(event.payload->'message'->>'id', '')::uuid,
          run.owner_user_id
        ),
        event.payload->'message'
      )
    )
  ELSE event.payload
END
FROM app.chat_generation_runs run
WHERE run.id = event.generation_id
  AND (
    (event.type = 'generation.accepted' AND NOT (event.payload->'chat' ? 'userId'))
    OR (event.type = 'generation.checkpointed' AND NOT (event.payload->'checkpoint'->'assistantMessage' ? 'userId'))
    OR (event.type = 'generation.committed' AND NOT (event.payload->'message' ? 'userId'))
  );

DROP FUNCTION pg_temp.chat_snapshot(uuid, text);
DROP FUNCTION pg_temp.chat_record_snapshot(uuid);
-- +goose StatementEnd

-- +goose Down
-- This migration only backfills durable snapshots; it is intentionally irreversible.
