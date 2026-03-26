-- +goose Up
ALTER TABLE app.notes
  ADD CONSTRAINT app_notes_source_not_blank CHECK (source IS NULL OR length(btrim(source)) > 0),
  ADD CONSTRAINT app_notes_folder_not_blank CHECK (folder IS NULL OR length(btrim(folder)) > 0);

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

ALTER TABLE app.chats
  ADD CONSTRAINT app_chats_title_not_blank CHECK (length(btrim(title)) > 0);

ALTER TABLE app.chat_messages
  ADD CONSTRAINT app_chat_messages_role_check CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  ADD CONSTRAINT app_chat_messages_content_not_blank CHECK (length(btrim(content)) > 0);

ALTER TABLE app.note_versions
  ADD CONSTRAINT app_note_versions_note_id_version_number_key UNIQUE (note_id, version_number);

ALTER TABLE app.note_shares
  ADD CONSTRAINT app_note_shares_note_id_shared_with_user_id_key UNIQUE (note_id, shared_with_user_id);

CREATE UNIQUE INDEX app_tags_owner_name_key
  ON app.tags (owner_user_id, lower(name));

CREATE INDEX app_notes_owner_user_id_idx
  ON app.notes (owner_user_id, updated_at DESC);

CREATE INDEX app_notes_parent_note_id_idx
  ON app.notes (parent_note_id);

CREATE INDEX app_note_versions_note_id_created_at_idx
  ON app.note_versions (note_id, created_at DESC);

CREATE INDEX app_note_versions_status_idx
  ON app.note_versions (status);

CREATE INDEX app_note_versions_note_type_idx
  ON app.note_versions (note_type);

CREATE INDEX app_note_versions_published_at_idx
  ON app.note_versions (published_at);

CREATE INDEX app_note_versions_search_idx
  ON app.note_versions USING gin (search_vector);

CREATE INDEX app_note_shares_shared_with_user_id_idx
  ON app.note_shares (shared_with_user_id);

CREATE INDEX app_tags_owner_user_id_idx
  ON app.tags (owner_user_id);

CREATE INDEX app_chats_owner_user_id_idx
  ON app.chats (owner_user_id, updated_at DESC);

CREATE INDEX app_chats_note_id_idx
  ON app.chats (note_id);

CREATE INDEX app_chat_messages_chat_id_created_at_idx
  ON app.chat_messages (chat_id, created_at ASC);

CREATE INDEX app_chat_messages_author_user_id_idx
  ON app.chat_messages (author_user_id);

CREATE INDEX app_chat_messages_parent_message_id_idx
  ON app.chat_messages (parent_message_id);

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

-- +goose Down
DROP TRIGGER IF EXISTS app_chat_messages_set_updated_at ON app.chat_messages;
DROP TRIGGER IF EXISTS app_chats_set_updated_at ON app.chats;
DROP TRIGGER IF EXISTS app_tags_set_updated_at ON app.tags;
DROP TRIGGER IF EXISTS app_note_versions_set_updated_at ON app.note_versions;
DROP TRIGGER IF EXISTS app_notes_set_updated_at ON app.notes;

DROP INDEX IF EXISTS app_chat_messages_parent_message_id_idx;
DROP INDEX IF EXISTS app_chat_messages_author_user_id_idx;
DROP INDEX IF EXISTS app_chat_messages_chat_id_created_at_idx;
DROP INDEX IF EXISTS app_chats_note_id_idx;
DROP INDEX IF EXISTS app_chats_owner_user_id_idx;
DROP INDEX IF EXISTS app_tags_owner_user_id_idx;
DROP INDEX IF EXISTS app_note_shares_shared_with_user_id_idx;
DROP INDEX IF EXISTS app_note_versions_search_idx;
DROP INDEX IF EXISTS app_note_versions_published_at_idx;
DROP INDEX IF EXISTS app_note_versions_note_type_idx;
DROP INDEX IF EXISTS app_note_versions_status_idx;
DROP INDEX IF EXISTS app_note_versions_note_id_created_at_idx;
DROP INDEX IF EXISTS app_notes_parent_note_id_idx;
DROP INDEX IF EXISTS app_notes_owner_user_id_idx;
DROP INDEX IF EXISTS app_tags_owner_name_key;

ALTER TABLE app.note_shares
  DROP CONSTRAINT IF EXISTS app_note_shares_note_id_shared_with_user_id_key,
  DROP CONSTRAINT IF EXISTS app_note_shares_permission_check;

ALTER TABLE app.note_versions
  DROP CONSTRAINT IF EXISTS app_note_versions_note_id_version_number_key,
  DROP CONSTRAINT IF EXISTS app_note_versions_schedule_order_check,
  DROP CONSTRAINT IF EXISTS app_note_versions_status_check,
  DROP CONSTRAINT IF EXISTS app_note_versions_note_type_check,
  DROP CONSTRAINT IF EXISTS app_note_versions_version_number_positive;

ALTER TABLE app.notes
  DROP CONSTRAINT IF EXISTS app_notes_source_not_blank,
  DROP CONSTRAINT IF EXISTS app_notes_folder_not_blank;

ALTER TABLE app.tags
  DROP CONSTRAINT IF EXISTS app_tags_name_not_blank;

ALTER TABLE app.chats
  DROP CONSTRAINT IF EXISTS app_chats_title_not_blank;

ALTER TABLE app.chat_messages
  DROP CONSTRAINT IF EXISTS app_chat_messages_content_not_blank,
  DROP CONSTRAINT IF EXISTS app_chat_messages_role_check;
