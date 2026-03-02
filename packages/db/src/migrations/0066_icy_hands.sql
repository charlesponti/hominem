-- Add noteId to chat table for linking chats to notes
ALTER TABLE chat ADD COLUMN note_id UUID REFERENCES notes(id) UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_chat_note_id ON chat(note_id) WHERE note_id IS NOT NULL;
