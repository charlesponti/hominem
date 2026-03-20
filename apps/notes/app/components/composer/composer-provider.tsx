import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

export type ComposerMode = 'generic' | 'note-aware' | 'chat-continuation';

export interface ComposerContext {
  // Draft state
  draftText: string;
  setDraftText: (text: string) => void;
  clearDraft: () => void;

  // Route context — updated by individual routes via useEffect
  mode: ComposerMode;
  setMode: (mode: ComposerMode) => void;
  noteId: string | null;
  noteTitle: string | null;
  setNoteContext: (id: string, title: string) => void;
  clearNoteContext: () => void;
  chatId: string | null;
  setChatContext: (id: string) => void;
  clearChatContext: () => void;

  // Expanded state (for GSAP to read)
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;

  // Refs for GSAP targets
  containerRef: React.RefObject<HTMLDivElement | null>;
  submitBtnRef: React.RefObject<HTMLButtonElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

const Ctx = createContext<ComposerContext | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [draftText, setDraftText] = useState('');
  const [mode, setMode] = useState<ComposerMode>('generic');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function clearDraft() {
    setDraftText('');
  }

  function setNoteContext(id: string, title: string) {
    setNoteId(id);
    setNoteTitle(title);
    setMode('note-aware');
    setChatId(null);
  }

  function clearNoteContext() {
    setNoteId(null);
    setNoteTitle(null);
    if (mode === 'note-aware') setMode('generic');
  }

  function setChatContext(id: string) {
    setChatId(id);
    setMode('chat-continuation');
    setNoteId(null);
    setNoteTitle(null);
  }

  function clearChatContext() {
    setChatId(null);
    if (mode === 'chat-continuation') setMode('generic');
  }

  return (
    <Ctx.Provider
      value={{
        draftText,
        setDraftText,
        clearDraft,
        mode,
        setMode,
        noteId,
        noteTitle,
        setNoteContext,
        clearNoteContext,
        chatId,
        setChatContext,
        clearChatContext,
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
