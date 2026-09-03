import type { Note } from '@hominem/rpc/types';

export interface NoteSavePayload {
  content: string;
  fileIds: string[];
  title: string | null;
}

interface PendingNoteSave {
  payload: NoteSavePayload;
  version: number;
}

export function createDebouncedNoteSaver({
  commit,
  delayMs,
  onError,
  persist,
}: {
  commit: (note: Note) => void;
  delayMs: number;
  onError?: (error: unknown) => void;
  persist: (payload: NoteSavePayload) => Promise<Note>;
}) {
  let pending: PendingNoteSave | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let version = 0;

  const clearTimer = () => {
    if (timer === null) {
      return;
    }
    clearTimeout(timer);
    timer = null;
  };

  const persistPending = async (next: PendingNoteSave) => {
    try {
      const note = await persist(next.payload);
      if (next.version === version) {
        commit(note);
      }
    } catch (error) {
      if (next.version === version) {
        onError?.(error);
      }
    }
  };

  const flush = () => {
    if (!pending) {
      return;
    }
    const next = pending;
    pending = null;
    clearTimer();
    persistPending(next);
  };

  return {
    flush,
    persistNow: async (payload: NoteSavePayload) => {
      version += 1;
      const next = { payload, version };
      pending = null;
      clearTimer();
      await persistPending(next);
    },
    schedule: (payload: NoteSavePayload) => {
      version += 1;
      pending = { payload, version };
      clearTimer();
      timer = setTimeout(flush, delayMs);
    },
  };
}
