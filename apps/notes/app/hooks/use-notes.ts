import type { NotesListInput } from '~/lib/trpc/notes-types';

import { trpc } from '~/lib/trpc';

export function useNotesList(options: NotesListInput = {}) {
  return trpc.notes.list.useQuery(options, {
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

export function useNote(id: string) {
  return trpc.notes.get.useQuery(
    { id },
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );
}

export function useCreateNote() {
  const utils = trpc.useUtils();

  return trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
    },
  });
}

export function useUpdateNote() {
  const utils = trpc.useUtils();

  return trpc.notes.update.useMutation({
    onSuccess: (data) => {
      utils.notes.list.invalidate();
      utils.notes.get.setData({ id: data.id }, data);
    },
  });
}

export function useDeleteNote() {
  const utils = trpc.useUtils();

  return trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
    },
  });
}

export function useSyncNotes() {
  const utils = trpc.useUtils();

  return trpc.notes.sync.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
    },
  });
}
