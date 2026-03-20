/**
 * ComposerProvider
 *
 * Holds only state that cannot be derived from the URL:
 *
 *   draftText        textarea value
 *   noteTitle        pushed by the note route once data loads
 *   attachedNotes    notes selected as LLM context in chat mode (Phase 2)
 *   isExpanded       mobile swipe state
 *   DOM refs         GSAP animation targets
 *
 * Mode, posture, and button behaviour are derived via useComposerMode
 * + deriveComposerPresentation — no imperative push from routes.
 */

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { Note } from '@hominem/hono-rpc/types/notes.types';

export type ComposerMode = 'generic' | 'note-aware' | 'chat-continuation';

export interface ComposerContext {
  draftText: string;
  setDraftText: (text: string) => void;
  clearDraft: () => void;

  noteTitle: string | null;
  setNoteTitle: (title: string | null) => void;

  attachedNotes: Note[];
  attachNote: (note: Note) => void;
  detachNote: (noteId: string) => void;
  clearAttachedNotes: () => void;

  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;

  containerRef: React.RefObject<HTMLDivElement | null>;
  submitBtnRef: React.RefObject<HTMLButtonElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

const Ctx = createContext<ComposerContext | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [draftText, setDraftText] = useState('');
  const [noteTitle, setNoteTitle] = useState<string | null>(null);
  const [attachedNotes, setAttachedNotes] = useState<Note[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const attachNote = useCallback((note: Note) => {
    setAttachedNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
  }, []);

  const detachNote = useCallback((noteId: string) => {
    setAttachedNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  return (
    <Ctx.Provider
      value={{
        draftText,
        setDraftText,
        clearDraft: () => setDraftText(''),
        noteTitle,
        setNoteTitle,
        attachedNotes,
        attachNote,
        detachNote,
        clearAttachedNotes: () => setAttachedNotes([]),
        isExpanded,
        setIsExpanded,
        containerRef,
        submitBtnRef,
        inputRef,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useComposer(): ComposerContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useComposer must be used within ComposerProvider');
  return ctx;
}
