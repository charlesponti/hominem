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

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Context,
  type ReactNode,
} from 'react'
import type { Note } from '@hominem/rpc/types/notes.types'

import { useFileUpload } from '~/lib/hooks/use-file-upload'
import type { UploadedFile } from '~/lib/types/upload'

export type ComposerMode = 'generic' | 'note-aware' | 'chat-continuation'

export interface ComposerDraftStateContext {
  draftText: string;
}

export interface ComposerDraftActionsContext {
  setDraftText: (text: string) => void;
  clearDraft: () => void;
}

export interface ComposerNoteTitleContext {
  noteTitle: string | null;
  setNoteTitle: (title: string | null) => void;
}

export interface ComposerAttachedNotesContext {
  attachedNotes: Note[];
  attachNote: (note: Note) => void;
  detachNote: (noteId: string) => void;
  clearAttachedNotes: () => void;
}

export interface ComposerExpansionContext {
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
}

export interface ComposerUploadStateContext {
  uploadState: {
    isUploading: boolean;
    progress: number;
    uploadedFiles: UploadedFile[];
    errors: string[];
  };
}

export interface ComposerUploadActionsContext {
  uploadFiles: (files: FileList | File[]) => Promise<UploadedFile[]>;
  removeUploadedFile: (fileId: string) => void;
  clearUploadedFiles: () => void;
}

export interface ComposerSubmissionContext {
  isSubmitting: boolean;
  runWithSubmitLock: (task: () => Promise<void>) => Promise<void>;
}

export interface ComposerRefsContext {
  containerRef: React.RefObject<HTMLDivElement | null>;
  submitBtnRef: React.RefObject<HTMLButtonElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

const DraftStateCtx = createContext<ComposerDraftStateContext | null>(null)
const DraftActionsCtx = createContext<ComposerDraftActionsContext | null>(null)
const NoteTitleCtx = createContext<ComposerNoteTitleContext | null>(null)
const AttachedNotesCtx = createContext<ComposerAttachedNotesContext | null>(null)
const ExpansionCtx = createContext<ComposerExpansionContext | null>(null)
const UploadStateCtx = createContext<ComposerUploadStateContext | null>(null)
const UploadActionsCtx = createContext<ComposerUploadActionsContext | null>(null)
const SubmissionCtx = createContext<ComposerSubmissionContext | null>(null)
const RefsCtx = createContext<ComposerRefsContext | null>(null)

function useRequiredContext<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context)
  if (!value) {
    throw new Error(`${name} must be used within ComposerProvider`)
  }

  return value
}

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [draftText, setDraftText] = useState('')
  const [noteTitle, setNoteTitle] = useState<string | null>(null)
  const [attachedNotes, setAttachedNotes] = useState<Note[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const submitBtnRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const submitLockRef = useRef(false)
  const { uploadState, uploadFiles, removeFile, clearAll } = useFileUpload()

  const clearDraft = useCallback(() => {
    setDraftText('')
  }, [])

  const attachNote = useCallback((note: Note) => {
    setAttachedNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]))
  }, [])

  const detachNote = useCallback((noteId: string) => {
    setAttachedNotes((prev) => prev.filter((n) => n.id !== noteId))
  }, [])

  const clearAttachedNotes = useCallback(() => {
    setAttachedNotes([])
  }, [])

  const runWithSubmitLock = useCallback(async (task: () => Promise<void>) => {
    if (submitLockRef.current) return

    submitLockRef.current = true
    setIsSubmitting(true)

    try {
      await task()
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }, [])

  const draftStateValue = useMemo<ComposerDraftStateContext>(() => ({
    draftText,
  }), [draftText])

  const draftActionsValue = useMemo<ComposerDraftActionsContext>(() => ({
    setDraftText,
    clearDraft,
  }), [clearDraft])

  const noteTitleValue = useMemo<ComposerNoteTitleContext>(() => ({
    noteTitle,
    setNoteTitle,
  }), [noteTitle])

  const attachedNotesValue = useMemo<ComposerAttachedNotesContext>(() => ({
    attachedNotes,
    attachNote,
    detachNote,
    clearAttachedNotes,
  }), [attachedNotes, attachNote, detachNote, clearAttachedNotes])

  const expansionValue = useMemo<ComposerExpansionContext>(() => ({
    isExpanded,
    setIsExpanded,
  }), [isExpanded])

  const uploadStateValue = useMemo<ComposerUploadStateContext>(() => ({
    uploadState,
  }), [
    uploadState.errors,
    uploadState.isUploading,
    uploadState.progress,
    uploadState.uploadedFiles,
  ])

  const uploadActionsValue = useMemo<ComposerUploadActionsContext>(() => ({
    uploadFiles,
    removeUploadedFile: removeFile,
    clearUploadedFiles: clearAll,
  }), [uploadFiles, removeFile, clearAll])

  const submissionValue = useMemo<ComposerSubmissionContext>(() => ({
    isSubmitting,
    runWithSubmitLock,
  }), [isSubmitting, runWithSubmitLock])

  const refsValue = useMemo<ComposerRefsContext>(() => ({
    containerRef,
    submitBtnRef,
    inputRef,
  }), [])

  return (
    <DraftStateCtx.Provider value={draftStateValue}>
      <DraftActionsCtx.Provider value={draftActionsValue}>
        <NoteTitleCtx.Provider value={noteTitleValue}>
          <AttachedNotesCtx.Provider value={attachedNotesValue}>
            <ExpansionCtx.Provider value={expansionValue}>
              <UploadStateCtx.Provider value={uploadStateValue}>
                <UploadActionsCtx.Provider value={uploadActionsValue}>
                  <SubmissionCtx.Provider value={submissionValue}>
                    <RefsCtx.Provider value={refsValue}>{children}</RefsCtx.Provider>
                  </SubmissionCtx.Provider>
                </UploadActionsCtx.Provider>
              </UploadStateCtx.Provider>
            </ExpansionCtx.Provider>
          </AttachedNotesCtx.Provider>
        </NoteTitleCtx.Provider>
      </DraftActionsCtx.Provider>
    </DraftStateCtx.Provider>
  )
}

export function useComposerDraftState(): ComposerDraftStateContext {
  return useRequiredContext(DraftStateCtx, 'useComposerDraftState')
}

export function useComposerDraftActions(): ComposerDraftActionsContext {
  return useRequiredContext(DraftActionsCtx, 'useComposerDraftActions')
}

export function useComposerDraft() {
  return {
    ...useComposerDraftState(),
    ...useComposerDraftActions(),
  }
}

export function useComposerNoteTitle(): ComposerNoteTitleContext {
  return useRequiredContext(NoteTitleCtx, 'useComposerNoteTitle')
}

export function useComposerAttachedNotes(): ComposerAttachedNotesContext {
  return useRequiredContext(AttachedNotesCtx, 'useComposerAttachedNotes')
}

export function useComposerExpansion(): ComposerExpansionContext {
  return useRequiredContext(ExpansionCtx, 'useComposerExpansion')
}

export function useComposerUploadState(): ComposerUploadStateContext {
  return useRequiredContext(UploadStateCtx, 'useComposerUploadState')
}

export function useComposerUploadActions(): ComposerUploadActionsContext {
  return useRequiredContext(UploadActionsCtx, 'useComposerUploadActions')
}

export function useComposerSubmission(): ComposerSubmissionContext {
  return useRequiredContext(SubmissionCtx, 'useComposerSubmission')
}

export function useComposerRefs(): ComposerRefsContext {
  return useRequiredContext(RefsCtx, 'useComposerRefs')
}

export function useComposer() {
  return {
    ...useComposerDraft(),
    ...useComposerNoteTitle(),
    ...useComposerAttachedNotes(),
    ...useComposerExpansion(),
    ...useComposerUploadState(),
    ...useComposerUploadActions(),
    ...useComposerSubmission(),
    ...useComposerRefs(),
  }
}
