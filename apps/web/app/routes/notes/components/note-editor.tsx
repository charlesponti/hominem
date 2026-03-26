import type { Note } from '@hominem/rpc/types/notes.types';
import { Button } from '@hominem/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/dropdown';
import { notesTokens } from '@hominem/ui/tokens';
import { Check, MoreHorizontal, Trash2 } from 'lucide-react';
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
  const [showSavedConfirm, setShowSavedConfirm] = useState(false);

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Brief "Saved" confirmation pop
  useEffect(() => {
    if (saveStatus === 'saved' && showSavedConfirm) {
      const t = setTimeout(() => setShowSavedConfirm(false), 1500);
      return () => clearTimeout(t);
    }

    return undefined;
  }, [saveStatus, showSavedConfirm]);

  function scheduleAutoSave(newTitle: string, newContent: string) {
    setSaveStatus('unsaved');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await updateNote.mutateAsync({ id: note.id, title: newTitle || null, content: newContent });
        setSaveStatus('saved');
        setShowSavedConfirm(true);
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
    <div className="w-full void-anim-enter">
      {/* Floating toolbar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Save status with transition */}
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-300">
            {saveStatus === 'saving' ? (
              <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                Saving…
              </span>
            ) : showSavedConfirm ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-success)] void-anim-pop">
                <Check className="size-3" />
                Saved
              </span>
            ) : saveStatus === 'unsaved' ? (
              <span className="text-[11px] font-medium text-[var(--color-accent)]">Editing</span>
            ) : null}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
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

      {/* Writing surface — immersive, borderless feel that lifts on focus */}
      <div
        className="group border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-low)] transition-all duration-300 focus-within:border-[var(--color-border-default)] focus-within:bg-[var(--color-bg-elevated)] focus-within:shadow-[var(--shadow-medium)]"
        style={{
          borderRadius: notesTokens.radii.panel,
          paddingInline: notesTokens.spacing.panelPaddingX,
          paddingBlock: notesTokens.spacing.panelPaddingY,
        }}
      >
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          aria-label="Note title"
          className="w-full border-0 bg-transparent text-[26px] font-semibold leading-tight tracking-[-0.025em] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]/40 outline-none sm:text-[30px]"
        />

        {/* Decorative divider — fades to accent when focused */}
        <div className="my-5 h-px bg-[var(--color-border-subtle)] transition-colors duration-300 group-focus-within:bg-[var(--color-border-default)]" />

        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing…"
          aria-label="Note content"
          className="w-full resize-none border-0 bg-transparent text-[16px] leading-[1.85] tracking-[-0.005em] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]/30 outline-none field-sizing-content min-h-[50vh]"
        />
      </div>
    </div>
  );
}
