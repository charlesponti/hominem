import type { NoteSearchResult } from '@hominem/rpc/types/notes.types';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [draft, setDraft] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<ChatComposerAttachment[]>([]);
  const { uploadFiles, uploadState } = useFileUpload();

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

  const restore = useCallback(
    ({
      draft: nextDraft,
      attachments,
    }: {
      draft: string;
      attachments: ChatComposerAttachment[];
    }) => {
      setDraft(nextDraft);
      setAttachedFiles(attachments);
    },
    [],
  );

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
