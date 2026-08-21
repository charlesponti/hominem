import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type { NoteFile } from './note-file.types';

export type { NoteFile };

export interface UseNoteEditorInput {
  id: string;
  title: string | null;
  content: string;
  files: NoteFile[];
}

export interface UseNoteEditorOutput {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  files: NoteFile[];
  setFiles: (files: NoteFile[]) => void;
  draftRef: MutableRefObject<{ title: string; content: string; files: NoteFile[] }>;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  isSaving: boolean;
  flushSave: () => Promise<void>;
  scheduleIdleSave: () => void;
  attachedFileIds: string[];
}

interface SaveHandler {
  (input: { id: string; title: string | null; content: string; fileIds: string[] }): Promise<void>;
}

interface DraftSnapshot {
  title: string;
  content: string;
  fileIds: string[];
}

const IDLE_SAVE_DELAY_MS = 1500;

function buildSnapshot(draft: {
  title: string;
  content: string;
  files: NoteFile[];
}): DraftSnapshot {
  return {
    title: draft.title,
    content: draft.content,
    fileIds: draft.files.map((file) => file.id),
  };
}

function snapshotsMatch(left: DraftSnapshot, right: DraftSnapshot) {
  return (
    left.title === right.title &&
    left.content === right.content &&
    left.fileIds.length === right.fileIds.length &&
    left.fileIds.every((fileId, index) => fileId === right.fileIds[index])
  );
}

export function useNoteEditor(note: UseNoteEditorInput, onSave: SaveHandler): UseNoteEditorOutput {
  const initialDraft = {
    title: note.title || '',
    content: note.content,
    files: note.files,
  };
  const [draft, setDraft] = useState(initialDraft);
  const draftRef = useRef(initialDraft);
  const lastSavedRef = useRef(buildSnapshot(initialDraft));
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveLoopRef = useRef<Promise<void> | null>(null);
  const pendingFlushRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const attachedFileIds = draft.files.map((file) => file.id);

  const setTitle = useCallback((title: string) => {
    const nextDraft = { ...draftRef.current, title };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSaveStatus('unsaved');
  }, []);

  const setContent = useCallback((content: string) => {
    const nextDraft = { ...draftRef.current, content };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSaveStatus('unsaved');
  }, []);

  const setFiles = useCallback((files: NoteFile[]) => {
    const nextDraft = { ...draftRef.current, files };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSaveStatus('unsaved');
  }, []);

  const flushSave = useCallback(async (): Promise<void> => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    pendingFlushRef.current = true;

    if (saveLoopRef.current) {
      await saveLoopRef.current;
      return;
    }

    const savePromise = (async () => {
      while (pendingFlushRef.current) {
        pendingFlushRef.current = false;

        const nextSnapshot = buildSnapshot(draftRef.current);
        if (snapshotsMatch(nextSnapshot, lastSavedRef.current)) {
          setSaveStatus('saved');
          continue;
        }

        setSaveStatus('saving');

        try {
          await onSave({
            id: note.id,
            title: nextSnapshot.title || null,
            content: nextSnapshot.content,
            fileIds: nextSnapshot.fileIds,
          });
          lastSavedRef.current = nextSnapshot;
        } catch (error) {
          setSaveStatus('unsaved');
          throw error;
        }

        if (
          pendingFlushRef.current ||
          !snapshotsMatch(buildSnapshot(draftRef.current), lastSavedRef.current)
        ) {
          setSaveStatus('unsaved');
          continue;
        }

        setSaveStatus('saved');
      }
    })().finally(() => {
      saveLoopRef.current = null;
    });

    saveLoopRef.current = savePromise;
    await savePromise;
  }, [note.id, onSave]);

  const scheduleIdleSave = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      void flushSave().catch(() => undefined);
    }, IDLE_SAVE_DELAY_MS);
  }, [flushSave]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  return {
    title: draft.title,
    setTitle,
    content: draft.content,
    setContent,
    files: draft.files,
    setFiles,
    draftRef,
    saveStatus,
    isSaving: saveStatus === 'saving',
    flushSave,
    scheduleIdleSave,
    attachedFileIds,
  };
}
