/**
 * ComposerProvider
 *
 * Manages only the state that CANNOT be derived from the URL:
 *   - draftText         the textarea value
 *   - noteTitle         pushed by the note route once data loads
 *   - defaultIntent     'note' | 'chat' — which action the send button commits to
 *                       when the Composer is in generic (home) mode
 *   - isExpanded        mobile swipe state
 *   - DOM refs          GSAP animation targets
 *
 * Route context (mode, noteId, chatId) is derived from the URL inside
 * useComposerMode — routes no longer need to call setChatContext etc.
 */

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

export type ComposerMode = 'generic' | 'note-aware' | 'chat-continuation';
export type DefaultIntent = 'note' | 'chat';

export interface ComposerContext {
  // Draft
  draftText: string;
  setDraftText: (text: string) => void;
  clearDraft: () => void;

  // Note title — set by the note route once its data loads
  noteTitle: string | null;
  setNoteTitle: (title: string | null) => void;

  // Default-mode intent toggle (Note vs Chat on the home/focus route)
  defaultIntent: DefaultIntent;
  setDefaultIntent: (intent: DefaultIntent) => void;

  // Mobile swipe
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;

  // GSAP targets
  containerRef: React.RefObject<HTMLDivElement | null>;
  submitBtnRef: React.RefObject<HTMLButtonElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

const Ctx = createContext<ComposerContext | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [draftText, setDraftText] = useState('');
  const [noteTitle, setNoteTitle] = useState<string | null>(null);
  const [defaultIntent, setDefaultIntent] = useState<DefaultIntent>('note');
  const [isExpanded, setIsExpanded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Ctx.Provider
      value={{
        draftText,
        setDraftText,
        clearDraft: () => setDraftText(''),
        noteTitle,
        setNoteTitle,
        defaultIntent,
        setDefaultIntent,
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
