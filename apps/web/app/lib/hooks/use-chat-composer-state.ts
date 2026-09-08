import type { NoteSearchResult } from '@hominem/rpc/types/notes.types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { useNoteSearch } from '~/hooks/use-notes';

import { useAddChatSource, useChatSources, useRemoveChatSource } from './use-chat-sources';
import { useFileUpload } from './use-file-upload';

export type ChatComposerNote = Pick<NoteSearchResult, 'id' | 'title' | 'excerpt'>;

export interface ChatComposerSeedNote {
  id: string;
  title?: string | null;
  excerpt?: string | null;
}

export interface ChatComposerAttachment {
  id: string;
  originalName: string;
  url: string;
  textContent?: string;
  content?: string;
}

const chatComposerAttachmentSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  url: z.string(),
});

const chatComposerPersistedStateSchema = z.object({
  draft: z.string().default(''),
  attachments: z.array(chatComposerAttachmentSchema).default([]),
});

export type ChatComposerPersistedState = z.infer<typeof chatComposerPersistedStateSchema>;

const CHAT_COMPOSER_STORAGE_PREFIX = 'chat-composer:';

function readPersistedComposerState(chatId: string): ChatComposerPersistedState | null {
  if (typeof window === 'undefined') return null;

  const storageKey = `${CHAT_COMPOSER_STORAGE_PREFIX}${chatId}`;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const result = chatComposerPersistedStateSchema.safeParse(parsed);
    if (!result.success) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Persistence is best-effort when storage is unavailable.
      }
      return null;
    }

    return result.data;
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Persistence is best-effort when storage is unavailable.
    }
    return null;
  }
}

function getMentionQuery(value: string) {
  const match = value.match(/#([a-z0-9-]*)$/i);
  return match?.[1] ?? '';
}

/**
 * Notes attached to a chat live at the chat level (chat_sources), not staged
 * per-message — picking a note or seeding from `seedNote` attaches it right away.
 */
export function useChatComposerState({
  chatId,
  seedNote,
}: {
  chatId: string;
  seedNote: ChatComposerSeedNote | null;
}) {
  // Draft/attachments start empty (matching SSR) and are restored from
  // localStorage in an effect after mount, rather than in the useState
  // initializer, so the client's first render matches the server-rendered
  // HTML and React doesn't hit a hydration mismatch on the composer's
  // disabled/value state.
  const [draft, setDraft] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<ChatComposerAttachment[]>([]);
  const [isRestored, setIsRestored] = useState(false);
  const { uploadFiles, uploadState } = useFileUpload();

  useEffect(() => {
    const persisted = readPersistedComposerState(chatId);
    setDraft(persisted?.draft ?? '');
    setAttachedFiles(persisted?.attachments ?? []);
    setIsRestored(true);
  }, [chatId]);

  useEffect(() => {
    if (!isRestored) return;

    const storageKey = `${CHAT_COMPOSER_STORAGE_PREFIX}${chatId}`;
    if (draft.trim().length === 0 && attachedFiles.length === 0) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Persistence is best-effort when storage is unavailable.
      }
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          attachments: attachedFiles.map(({ id, originalName, url }) => ({
            id,
            originalName,
            url,
          })),
          draft,
        }),
      );
    } catch {
      // Persistence is best-effort when storage is unavailable or full.
    }
  }, [attachedFiles, chatId, draft, isRestored]);

  const { data: sources = [] } = useChatSources(chatId);
  const { mutate: addSource } = useAddChatSource();
  const { mutate: removeSource } = useRemoveChatSource(chatId);

  const selectedNotesForSend: ChatComposerNote[] = useMemo(
    () => sources.map((source) => ({ id: source.noteId, title: source.title, excerpt: null })),
    [sources],
  );

  const seededSourceNoteId = seedNote?.id ?? null;
  useEffect(() => {
    if (!seededSourceNoteId) return;
    if (sources.some((source) => source.noteId === seededSourceNoteId)) return;
    addSource({ chatId, noteId: seededSourceNoteId });
  }, [addSource, chatId, seededSourceNoteId, sources]);

  const mentionQuery = getMentionQuery(draft);
  const { data: searchResults } = useNoteSearch(mentionQuery, mentionQuery.length > 0);
  const suggestions = useMemo(
    () =>
      (searchResults?.notes ?? []).filter(
        (note) => !selectedNotesForSend.some((selected) => selected.id === note.id),
      ),
    [searchResults?.notes, selectedNotesForSend],
  );

  const selectSuggestion = useCallback(
    (note: ChatComposerNote) => addSource({ chatId, noteId: note.id }),
    [addSource, chatId],
  );

  const removeSelectedNote = useCallback((noteId: string) => removeSource(noteId), [removeSource]);

  const attachFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const uploaded = await uploadFiles(fileList);
      if (uploaded.length === 0) return;

      setAttachedFiles((current) => [...current, ...uploaded]);
    },
    [uploadFiles],
  );

  const removeAttachment = useCallback((fileId: string) => {
    setAttachedFiles((current) => current.filter((file) => file.id !== fileId));
  }, []);

  const clear = useCallback(() => {
    setDraft('');
    setAttachedFiles([]);
  }, []);

  const restore = useCallback(({ draft: nextDraft, attachments }: ChatComposerPersistedState) => {
    setDraft(nextDraft);
    setAttachedFiles(attachments);
  }, []);

  return {
    attachFiles,
    attachedFiles,
    clear,
    draft,
    draftWithSeed: draft,
    mentionQuery,
    removeAttachment,
    removeSelectedNote,
    restore,
    selectedNotesForSend,
    selectSuggestion,
    setDraft,
    suggestions,
    uploadState,
  };
}
