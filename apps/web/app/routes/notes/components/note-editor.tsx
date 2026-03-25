import type { Note } from '@hominem/rpc/types/notes.types';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { useDeleteNote, useUpdateNote } from '~/hooks/use-notes';

interface NoteEditorProps {
  note: Note;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved';
type EditorTab = 'write' | 'preview';

export function NoteEditor({ note }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [tab, setTab] = useState<EditorTab>('write');

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flush pending save on unmount
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
    if (confirm('Delete this note?')) {
      await deleteNote.mutateAsync({ id: note.id });
    }
  }

  const statusLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved';

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled"
        aria-label="Note title"
        className="w-full border-0 bg-transparent text-[2rem] font-semibold leading-tight text-text-primary placeholder:text-text-tertiary/40 outline-none"
      />

      {/* Write / Preview tabs */}
      <div className="flex items-center gap-1 border-b border-border/30">
        <button
          type="button"
          onClick={() => setTab('write')}
          className={[
            'body-4 -mb-px border-b-2 px-3 pb-2 transition-colors',
            tab === 'write'
              ? 'border-foreground text-text-primary'
              : 'border-transparent text-text-tertiary hover:text-text-secondary',
          ].join(' ')}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={[
            'body-4 -mb-px border-b-2 px-3 pb-2 transition-colors',
            tab === 'preview'
              ? 'border-foreground text-text-primary'
              : 'border-transparent text-text-tertiary hover:text-text-secondary',
          ].join(' ')}
        >
          Preview
        </button>
      </div>

      {/* Editor surface */}
      {tab === 'write' ? (
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing… markdown is supported"
          aria-label="Note content"
          className="w-full resize-none border-0 bg-transparent font-mono text-sm leading-relaxed text-foreground placeholder:text-text-tertiary/40 outline-none field-sizing-content min-h-64"
        />
      ) : (
        <div className="prose-note min-h-64">
          {content.trim() ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <p className="body-2 text-text-tertiary/40 italic">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/30 pt-3">
        <span className="body-4 text-text-tertiary/60">{statusLabel}</span>
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete note"
          className="body-4 flex items-center gap-1.5 text-text-tertiary/60 transition-colors hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
