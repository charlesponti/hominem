-- +goose Up
ALTER TABLE app.notes
  ADD CONSTRAINT app_notes_source_not_blank CHECK (source IS NULL OR length(btrim(source)) > 0);

ALTER TABLE app.note_versions
  ADD CONSTRAINT app_note_versions_version_number_positive CHECK (version_number > 0),
  ADD CONSTRAINT app_note_versions_note_type_check CHECK (note_type IN ('note', 'document', 'template')),
  ADD CONSTRAINT app_note_versions_status_check CHECK (status IN ('draft', 'published', 'archived')),
  ADD CONSTRAINT app_note_versions_schedule_order_check CHECK (
    scheduled_for IS NULL OR published_at IS NULL OR scheduled_for <= published_at
  );

ALTER TABLE app.note_shares
  ADD CONSTRAINT app_note_shares_permission_check CHECK (permission IN ('read', 'write'));

ALTER TABLE app.tags
  ADD CONSTRAINT app_tags_name_not_blank CHECK (length(btrim(name)) > 0);

ALTER TABLE app.tag_assignments
  ADD CONSTRAINT app_tag_assignments_entity_type_not_blank CHECK (length(btrim(entity_type)) > 0),
  ADD CONSTRAINT app_tag_assignments_tag_entity_key UNIQUE (tag_id, entity_type, entity_id);

ALTER TABLE app.chats
  ADD CONSTRAINT app_chats_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_chats_source_not_blank CHECK (source IS NULL OR length(btrim(source)) > 0),
  ADD CONSTRAINT app_chats_archived_after_created_check CHECK (
    archived_at IS NULL OR archived_at >= createdAt
  ),
  ADD CONSTRAINT app_chats_last_message_after_created_check CHECK (last_message_at >= createdAt);

ALTER TABLE app.chat_messages
  ADD CONSTRAINT app_chat_messages_role_check CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  ADD CONSTRAINT app_chat_messages_content_not_blank CHECK (length(btrim(content)) > 0);

ALTER TABLE app.note_versions
  ADD CONSTRAINT app_note_versions_note_id_version_number_key UNIQUE (note_id, version_number);

ALTER TABLE app.note_shares
  ADD CONSTRAINT app_note_shares_note_id_shared_with_userId_key UNIQUE (note_id, shared_with_userId);

ALTER TABLE app.chat_messages
  ADD CONSTRAINT app_chat_messages_chat_id_id_key UNIQUE (chat_id, id);

ALTER TABLE app.chat_messages
  ADD CONSTRAINT app_chat_messages_chat_id_parent_message_id_fkey
  FOREIGN KEY (chat_id, parent_message_id) REFERENCES app.chat_messages(chat_id, id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE UNIQUE INDEX app_tags_owner_name_key
  ON app.tags (owner_userId, lower(name));

CREATE INDEX app_notes_owner_userId_idx
  ON app.notes (owner_userId, updatedAt DESC);

CREATE INDEX app_notes_parent_note_id_idx
  ON app.notes (parent_note_id);

CREATE INDEX app_note_versions_note_id_createdAt_idx
  ON app.note_versions (note_id, createdAt DESC);

CREATE INDEX app_note_versions_created_by_userId_idx
  ON app.note_versions (created_by_userId)
  WHERE created_by_userId IS NOT NULL;

CREATE INDEX app_note_versions_status_idx
  ON app.note_versions (status);

CREATE INDEX app_note_versions_note_type_idx
  ON app.note_versions (note_type);

CREATE INDEX app_note_versions_published_at_idx
  ON app.note_versions (published_at);

CREATE INDEX app_note_versions_search_idx
  ON app.note_versions USING gin (search_vector);

CREATE INDEX app_note_shares_shared_with_userId_idx
  ON app.note_shares (shared_with_userId);

CREATE INDEX app_tags_owner_userId_idx
  ON app.tags (owner_userId);

CREATE INDEX app_tag_assignments_tag_id_idx
  ON app.tag_assignments (tag_id);

CREATE INDEX app_tag_assignments_entity_idx
  ON app.tag_assignments (entity_type, entity_id);

CREATE INDEX app_tag_assignments_assigned_by_userId_idx
  ON app.tag_assignments (assigned_by_userId)
  WHERE assigned_by_userId IS NOT NULL;

CREATE INDEX app_chats_owner_userId_idx
  ON app.chats (owner_userId, updatedAt DESC);

CREATE INDEX app_chats_note_id_idx
  ON app.chats (note_id);

CREATE INDEX app_chats_last_message_at_idx
  ON app.chats (owner_userId, last_message_at DESC);

CREATE INDEX app_chat_messages_chat_id_createdAt_idx
  ON app.chat_messages (chat_id, createdAt ASC);

CREATE INDEX app_chat_messages_author_userId_idx
  ON app.chat_messages (author_userId);

CREATE INDEX app_chat_messages_parent_message_id_idx
  ON app.chat_messages (parent_message_id);

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION app.sync_chat_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_chat_id uuid;
  old_chat_id uuid;
BEGIN
  new_chat_id := NEW.chat_id;
  old_chat_id := OLD.chat_id;

  UPDATE app.chats chat
  SET last_message_at = COALESCE((
    SELECT max(message.createdAt)
    FROM app.chat_messages message
    WHERE message.chat_id = new_chat_id
  ), chat.createdAt)
  WHERE new_chat_id IS NOT NULL
    AND chat.id = new_chat_id;

  IF old_chat_id IS NOT NULL AND old_chat_id IS DISTINCT FROM new_chat_id THEN
    UPDATE app.chats chat
    SET last_message_at = COALESCE((
      SELECT max(message.createdAt)
      FROM app.chat_messages message
      WHERE message.chat_id = old_chat_id
    ), chat.createdAt)
    WHERE chat.id = old_chat_id;
  END IF;

  RETURN NULL;
END
$$;
-- +goose StatementEnd

CREATE TRIGGER app_notes_set_updated_at
  BEFORE UPDATE ON app.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_note_versions_set_updated_at
  BEFORE UPDATE ON app.note_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_tags_set_updated_at
  BEFORE UPDATE ON app.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_chats_set_updated_at
  BEFORE UPDATE ON app.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_chat_messages_set_updated_at
  BEFORE UPDATE ON app.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_chat_messages_sync_last_message_at
  AFTER INSERT OR UPDATE OR DELETE ON app.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_chat_last_message_at();

-- +goose Down
DROP TRIGGER IF EXISTS app_chat_messages_sync_last_message_at ON app.chat_messages;
DROP TRIGGER IF EXISTS app_chat_messages_set_updated_at ON app.chat_messages;
DROP TRIGGER IF EXISTS app_chats_set_updated_at ON app.chats;
DROP TRIGGER IF EXISTS app_tags_set_updated_at ON app.tags;
DROP TRIGGER IF EXISTS app_note_versions_set_updated_at ON app.note_versions;
DROP TRIGGER IF EXISTS app_notes_set_updated_at ON app.notes;

DROP FUNCTION IF EXISTS app.sync_chat_last_message_at();

DROP INDEX IF EXISTS app_chat_messages_parent_message_id_idx;
DROP INDEX IF EXISTS app_chat_messages_author_userId_idx;
DROP INDEX IF EXISTS app_chat_messages_chat_id_createdAt_idx;
DROP INDEX IF EXISTS app_chats_last_message_at_idx;
DROP INDEX IF EXISTS app_chats_note_id_idx;
DROP INDEX IF EXISTS app_chats_owner_userId_idx;
DROP INDEX IF EXISTS app_note_versions_created_by_userId_idx;
DROP INDEX IF EXISTS app_tag_assignments_assigned_by_userId_idx;
DROP INDEX IF EXISTS app_tag_assignments_entity_idx;
DROP INDEX IF EXISTS app_tag_assignments_tag_id_idx;
DROP INDEX IF EXISTS app_tags_owner_userId_idx;
DROP INDEX IF EXISTS app_note_shares_shared_with_userId_idx;
DROP INDEX IF EXISTS app_note_versions_search_idx;
DROP INDEX IF EXISTS app_note_versions_published_at_idx;
DROP INDEX IF EXISTS app_note_versions_note_type_idx;
DROP INDEX IF EXISTS app_note_versions_status_idx;
DROP INDEX IF EXISTS app_note_versions_note_id_createdAt_idx;
DROP INDEX IF EXISTS app_notes_parent_note_id_idx;
DROP INDEX IF EXISTS app_notes_owner_userId_idx;
DROP INDEX IF EXISTS app_tags_owner_name_key;

ALTER TABLE app.note_shares
  DROP CONSTRAINT IF EXISTS app_note_shares_note_id_shared_with_userId_key,
  DROP CONSTRAINT IF EXISTS app_note_shares_permission_check;

ALTER TABLE app.note_versions
  DROP CONSTRAINT IF EXISTS app_note_versions_note_id_version_number_key,
  DROP CONSTRAINT IF EXISTS app_note_versions_schedule_order_check,
  DROP CONSTRAINT IF EXISTS app_note_versions_status_check,
  DROP CONSTRAINT IF EXISTS app_note_versions_note_type_check,
  DROP CONSTRAINT IF EXISTS app_note_versions_version_number_positive;

ALTER TABLE app.notes
  DROP CONSTRAINT IF EXISTS app_notes_source_not_blank;

ALTER TABLE app.tags
  DROP CONSTRAINT IF EXISTS app_tags_name_not_blank;

ALTER TABLE app.tag_assignments
  DROP CONSTRAINT IF EXISTS app_tag_assignments_tag_entity_key,
  DROP CONSTRAINT IF EXISTS app_tag_assignments_entity_type_not_blank;

ALTER TABLE app.chats
  DROP CONSTRAINT IF EXISTS app_chats_last_message_after_created_check,
  DROP CONSTRAINT IF EXISTS app_chats_archived_after_created_check,
  DROP CONSTRAINT IF EXISTS app_chats_source_not_blank,
  DROP CONSTRAINT IF EXISTS app_chats_title_not_blank;

ALTER TABLE app.chat_messages
  DROP CONSTRAINT IF EXISTS app_chat_messages_chat_id_parent_message_id_fkey,
  DROP CONSTRAINT IF EXISTS app_chat_messages_chat_id_id_key,
  DROP CONSTRAINT IF EXISTS app_chat_messages_content_not_blank,
  DROP CONSTRAINT IF EXISTS app_chat_messages_role_check;
