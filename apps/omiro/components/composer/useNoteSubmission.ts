import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { donateAddNoteIntent } from '~/services/intent-donation';
import { useCreateNote } from '~/services/notes/use-create-note';

interface NoteSubmissionInput {
  clearComposer: () => void;
  fileIds: string[];
  message: string;
}

export function useNoteSubmission() {
  const queryClient = useQueryClient();
  const { mutateAsync: createNote, isPending: isSaving } = useCreateNote();

  const submitNote = useCallback(
    async ({ clearComposer, fileIds, message }: NoteSubmissionInput) => {
      if (isSaving) return;

      await createNote({ text: message.trim(), fileIds });
      donateAddNoteIntent();
      await invalidateInboxQueries(queryClient);
      clearComposer();
    },
    [createNote, isSaving, queryClient],
  );

  return { isSaving, submitNote };
}
