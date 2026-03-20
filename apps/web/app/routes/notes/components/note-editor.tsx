import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { Inline } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Textarea } from '@hominem/ui/components/ui/textarea';
import { TextField } from '@hominem/ui/text-field';
import { Save, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { useDeleteNote, useUpdateNote } from '~/hooks/use-notes';

interface NoteEditorProps {
  note: Note;
}

export function NoteEditor({ note }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateNote.mutateAsync({
        id: note.id,
        title: title || null,
        content,
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [note.id, title, content, updateNote]);

  const handleDelete = useCallback(async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote.mutateAsync({ id: note.id });
    }
  }, [note.id, deleteNote]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/50 pb-4">
        <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">Note</div>
        <div className="mt-3 flex items-start justify-between gap-4">
          <TextField
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled note"
            aria-label="Note title"
            className="heading-2 h-auto flex-1 border-0 bg-transparent px-0 text-foreground shadow-none focus-visible:ring-0"
          />
          <Inline gap="sm">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="rounded-md px-4"
            >
              <Save className="mr-1 size-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} className="rounded-md px-3">
              <Trash2 className="size-4" />
            </Button>
          </Inline>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your note..."
          className="body-1 h-full min-h-[26rem] resize-none border-0 bg-transparent px-0 py-6 text-foreground placeholder:text-text-tertiary shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="border-t border-border/50 pt-4">
        <div className="body-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-text-tertiary">
          <span>Created {new Date(note.createdAt).toLocaleString()}</span>
          <span>Updated {new Date(note.updatedAt).toLocaleString()}</span>
          {note.versionNumber > 1 ? <span>Version {note.versionNumber}</span> : null}
        </div>
      </div>
    </div>
  );
}
