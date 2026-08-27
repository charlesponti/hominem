-- +goose Up
-- +goose StatementBegin
INSERT INTO app.ai_chat_threads (thread_id, owner_user_id)
SELECT id, owner_userId
FROM app.chats
ON CONFLICT (thread_id) DO NOTHING;

INSERT INTO app.ai_chat_messages (id, thread_id, message, created_at, updated_at)
SELECT
  'backfill:' || m.id::text,
  m.chat_id,
  jsonb_build_object('role', m.role, 'content', m.content),
  m.createdAt,
  m.updatedAt
FROM app.chat_messages m
JOIN app.ai_chat_threads t ON t.thread_id = m.chat_id
ON CONFLICT (id) DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM app.ai_chat_messages WHERE id LIKE 'backfill:%';
DELETE FROM app.ai_chat_threads t
WHERE NOT EXISTS (
  SELECT 1 FROM app.ai_chat_runs r WHERE r.thread_id = t.thread_id
);
-- +goose StatementEnd
