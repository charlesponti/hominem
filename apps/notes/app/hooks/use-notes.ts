import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';
import type {
  Note,
  NotesListInput,
  NotesGetOutput,
  NotesCreateInput,
  NotesCreateOutput,
  NotesUpdateInput,
  NotesUpdateOutput,
  NotesDeleteOutput,
} from '@hominem/hono-rpc/types/notes.types';

export function useNotesList(options: NotesListInput = {}) {
  return useHonoQuery<Note[]>(
    ['notes', 'list', options],
    async ({ notes }) => {
      const data = await notes.list(options)
      return Array.isArray(data.notes) ? data.notes : []
    },
    {
      staleTime: 1000 * 60 * 1, // 1 minute
    },
  );
}

export function useNote(id: string) {
  return useHonoQuery<NotesGetOutput>(
    ['notes', id],
    ({ notes }) => notes.get({ id }),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );
}

export function useCreateNote() {
  const utils = useHonoUtils();

  return useHonoMutation<NotesCreateOutput, NotesCreateInput>(
    ({ notes }, variables) => notes.create(variables),
    {
      onSuccess: () => {
        utils.invalidate(['notes', 'list']);
      },
    },
  );
}

export function useUpdateNote() {
  const utils = useHonoUtils();

  return useHonoMutation<NotesUpdateOutput, { id: string } & NotesUpdateInput>(
    ({ notes }, variables) => notes.update(variables),
    {
      onSuccess: () => {
        utils.invalidate(['notes', 'list']);
      },
    },
  );
}

export function useDeleteNote() {
  const utils = useHonoUtils();

  return useHonoMutation<NotesDeleteOutput, { id: string }>(
    ({ notes }, variables) => notes.delete(variables),
    {
      onSuccess: () => {
        utils.invalidate(['notes', 'list']);
      },
    },
  );
}
