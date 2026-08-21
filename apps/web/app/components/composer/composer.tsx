import type { Note } from '@hominem/rpc/types/notes.types';
import type { ChangeEvent } from 'react';
import { memo, useActionState, useRef } from 'react';

import { AttachedNotesList } from './attached-notes-list';
import { appendChatAttachmentContext, appendNoteAttachments } from './attachment-formatting';
import { buildNoteContext, toNoteTitle } from './composer-actions';
import { ComposerActionsRow } from './composer-actions-row';
import { ComposerAttachmentList } from './composer-attachment-list';
import type { ComposerPresentation } from './composer-presentation';
import { deriveComposerPresentation } from './composer-presentation';
import type { ComposerMode } from './composer-provider';
import { useComposerActionsRef, useComposerSlice, useComposerStore } from './composer-provider';
import { ComposerShell } from './composer-shell';
import { ComposerTools } from './composer-tools';
import { NotePickerDialog } from './note-picker-dialog';

export interface ComposerProps {
  mode: ComposerMode;
  noteId?: string | null;
  chatId?: string | null;
  /** Derived from useNote(noteId) in the layout — no useEffect push needed */
  noteTitle?: string | null;
  navigate: (path: string) => void;
  /** Notes for the picker — fetched in layout, passed as stable prop */
  notes?: Note[];
}

export function Composer(props: ComposerProps) {
  const presentation = deriveComposerPresentation(props.mode);
  if (presentation.posture === 'hidden') return null;
  return <ComposerForm {...props} presentation={presentation} />;
}

const ComposerForm = memo(function ComposerForm({
  noteId,
  chatId,
  noteTitle,
  notes = [],
  presentation,
}: ComposerProps & { presentation: ComposerPresentation }) {
  const store = useComposerStore();
  const actionsRef = useComposerActionsRef();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const notePickerDialogRef = useRef<HTMLDialogElement>(null);

  const [, formAction, isPending] = useActionState(async (_prevState: null, formData: FormData) => {
    const text = ((formData.get('draft') as string) ?? '').trim();
    const intent = formData.get('intent') as string;
    const fNoteId = (formData.get('noteId') as string) || null;
    const fChatId = (formData.get('chatId') as string) || null;
    const fNoteTitle = (formData.get('noteTitle') as string) || null;

    const { attachedNotes, uploadedFiles } = store.getSnapshot();
    const hasContent = text.length > 0 || uploadedFiles.length > 0;
    if (!hasContent) return null;

    const actions = actionsRef.current;

    switch (intent) {
      case 'send-reply': {
        if (!fChatId) break;
        const prefix = buildNoteContext(attachedNotes);
        const message = appendChatAttachmentContext(prefix ? `${prefix}${text}` : text, [
          ...uploadedFiles,
        ]);
        await actions.sendMessage({ chatId: fChatId, message });
        store.dispatch({ type: 'CLEAR' });
        break;
      }
      case 'update-note': {
        if (!fNoteId) break;
        await actions.updateNote({
          id: fNoteId,
          content: appendNoteAttachments(text, [...uploadedFiles]),
        });
        store.dispatch({ type: 'CLEAR_DRAFT' });
        store.dispatch({ type: 'CLEAR_FILES' });
        break;
      }
      case 'save-note':
      case 'save-as-note': {
        const title = toNoteTitle(text);
        await actions.createNote({
          content: appendNoteAttachments(text, [...uploadedFiles]),
          ...(title ? { title } : {}),
        });
        store.dispatch({ type: 'CLEAR_DRAFT' });
        store.dispatch({ type: 'CLEAR_FILES' });
        break;
      }
      case 'start-chat': {
        const seedText = fNoteTitle ? `[Regarding note: "${fNoteTitle}"]\n\n${text}` : text;
        const title = toNoteTitle(text, fNoteTitle ? 'Note chat' : 'New session');
        const chat = await actions.createChat({
          seedText: appendChatAttachmentContext(seedText, [...uploadedFiles]),
          title,
        });
        store.dispatch({ type: 'CLEAR_DRAFT' });
        store.dispatch({ type: 'CLEAR_FILES' });
        actions.navigate(`/chat/${chat.id}`);
        break;
      }
    }

    return null;
  }, null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    store.dispatch({ type: 'SET_UPLOADING', isUploading: true });
    try {
      const uploaded = await actionsRef.current.uploadFiles(files);
      store.dispatch({ type: 'ADD_FILES', files: uploaded });
    } catch (err) {
      store.dispatch({
        type: 'SET_UPLOAD_ERRORS',
        errors: [err instanceof Error ? err.message : 'Upload failed'],
      });
    } finally {
      store.dispatch({ type: 'SET_UPLOADING', isUploading: false });
      e.target.value = '';
      inputRef.current?.focus();
    }
  }

  const isDraftMode = presentation.posture === 'draft';

  return (
    <>
      <input
        ref={fileInputRef}
        data-testid="composer-file-input"
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        data-testid="composer-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <ComposerShell>
        <form action={formAction} className="flex flex-col gap-1.5">
          <input type="hidden" name="noteId" value={noteId ?? ''} />
          <input type="hidden" name="chatId" value={chatId ?? ''} />
          <input type="hidden" name="noteTitle" value={noteTitle ?? ''} />

          <ComposerAttachmentList />

          <AttachedNotesList />

          <ComposerInput
            ref={inputRef}
            placeholder={presentation.placeholder}
            isDraftMode={isDraftMode}
            isPending={isPending}
          />

          <div className="mt-auto flex shrink-0 items-center justify-between">
            <ComposerTools
              fileInputRef={fileInputRef}
              cameraInputRef={cameraInputRef}
              notePickerDialogRef={notePickerDialogRef}
              presentation={presentation}
            />
            <ComposerActionsRow presentation={presentation} isPending={isPending} />
          </div>
        </form>
      </ComposerShell>
      <NotePickerDialog ref={notePickerDialogRef} notes={notes} inputRef={inputRef} />
    </>
  );
});

const ComposerInput = memo(function ComposerInput({
  ref,
  placeholder,
  isDraftMode,
  isPending,
}: {
  ref: React.RefObject<HTMLTextAreaElement | null>;
  placeholder: string;
  isDraftMode: boolean;
  isPending: boolean;
}) {
  const store = useComposerStore();
  const draft = useComposerSlice((s) => s.draft);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      const submitBtn = ref.current?.form?.querySelector('[data-testid="composer-primary"]');
      if (submitBtn && submitBtn instanceof HTMLButtonElement) {
        submitBtn.click();
      }
    }
  }

  return (
    <textarea
      ref={ref}
      name="draft"
      rows={1}
      data-testid="composer-input"
      value={draft}
      onChange={(e) => store.dispatch({ type: 'SET_DRAFT', text: e.target.value })}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={isPending}
      aria-label="Compose message or note"
      className={[
        'body-1 w-full resize-none border-0 bg-transparent p-0 text-text-primary outline-none field-sizing-content overflow-y-auto placeholder:text-text-tertiary focus:outline-none',
        isDraftMode ? 'min-h-7 max-h-56' : 'min-h-6 max-h-40',
      ].join(' ')}
    />
  );
});
