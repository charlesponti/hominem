import type { NoteSearchResult } from '@hominem/rpc/types/notes.types';
import { slugifyText } from '@hominem/utils/text';
import { useCallback, useMemo, useState } from 'react';

import { useNoteSearch } from '~/hooks/use-notes';

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

export function useChatComposerState({ seedNote }: { seedNote: ChatComposerSeedNote | null }) {
  const [draft, setDraft] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<ChatComposerNote[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<ChatComposerAttachment[]>([]);
  const { uploadFiles, uploadState } = useFileUpload();

  const seededNote = useMemo(
    () => (seedNote ? [{ id: seedNote.id, title: seedNote.title, excerpt: seedNote.excerpt }] : []),
    [seedNote],
  );

  const selectedNotesForSend = useMemo(
    () => [
      ...seededNote,
      ...selectedNotes.filter((note) => !seededNote.some((seed) => seed.id === note.id)),
    ],
    [seededNote, selectedNotes],
  );

  const draftWithSeed = useMemo(() => {
    if (!seedNote) return draft;

    const slug = slugifyText(seedNote.title ?? null);
    if (!slug || draft.includes(`#${slug}`)) return draft;

    return `${draft} #${slug}`.trim();
  }, [draft, seedNote]);

  const mentionQuery = getMentionQuery(draftWithSeed);
  const { data: searchResults } = useNoteSearch(mentionQuery, mentionQuery.length > 0);
  const suggestions = useMemo(
    () =>
      (searchResults?.notes ?? []).filter(
        (note) => !selectedNotesForSend.some((selected) => selected.id === note.id),
      ),
    [searchResults?.notes, selectedNotesForSend],
  );

  const selectSuggestion = useCallback((note: ChatComposerNote) => {
    setSelectedNotes((current) =>
      current.some((selected) => selected.id === note.id) ? current : [...current, note],
    );
  }, []);

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
    setSelectedNotes([]);
  }, []);

  const restore = useCallback(
    ({
      draft: nextDraft,
      attachments,
      notes,
    }: {
      draft: string;
      attachments: ChatComposerAttachment[];
      notes: ChatComposerNote[];
    }) => {
      setDraft(nextDraft);
      setAttachedFiles(attachments);
      setSelectedNotes(notes);
    },
    [],
  );

  return {
    attachFiles,
    attachedFiles,
    clear,
    draft,
    draftWithSeed,
    mentionQuery,
    removeAttachment,
    restore,
    selectedNotes,
    selectedNotesForSend,
    selectSuggestion,
    setDraft,
    suggestions,
    uploadState,
  };
}
