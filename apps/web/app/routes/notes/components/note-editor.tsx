import type { Note } from '@hominem/rpc/types/notes.types';
import { Button } from '@hominem/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@hominem/ui/dropdown';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useDeleteNote, useUpdateNote } from '~/hooks/use-notes';

interface NoteEditorProps {
  note: Note;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved';

export function NoteEditor({ note }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function scheduleAutoSave(newTitle: string, newContent: string) {
    setSaveStatus('unsaved');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await updateNote.mutateAsync({ id: note.id, title: newTitle || null, content: newContent });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, 600);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    scheduleAutoSave(newTitle, content);
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newContent = e.target.value;
    setContent(newContent);
    scheduleAutoSave(title, newContent);
  }

  async function handleDelete() {
    await deleteNote.mutateAsync({ id: note.id });
  }

  return (
    <div className="w-full rounded-xl border border-border-subtle bg-surface p-6">
      {/* Title row */}
      <div className="flex items-start gap-4">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          aria-label="Note title"
          className="heading-2 min-w-0 flex-1 border-0 bg-transparent text-text-primary placeholder:text-text-tertiary outline-none"
        />
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              saveStatus === 'saving'
                ? 'bg-elevated text-text-tertiary'
                : saveStatus === 'unsaved'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-success/10 text-success'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 text-text-tertiary">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="size-4" />
                Delete note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content — seamless, same surface */}
      <textarea
        value={content}
        onChange={handleContentChange}
        placeholder="Start writing…"
        aria-label="Note content"
        className="body-1 mt-6 w-full resize-none border-0 bg-transparent text-text-primary placeholder:text-text-tertiary outline-none field-sizing-content min-h-[50vh]"
      />
    </div>
  );
}
