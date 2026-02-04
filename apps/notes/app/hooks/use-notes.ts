import type { HonoClient } from '@hominem/hono-client';
import type {
  NotesListInput,
  NotesListOutput,
  NotesGetOutput,
  NotesCreateInput,
  NotesCreateOutput,
  NotesUpdateInput,
  NotesUpdateOutput,
  NotesDeleteOutput,
  NotesSyncInput,
  NotesSyncOutput,
} from '@hominem/hono-rpc/types/notes.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

export function useNotesList(options: NotesListInput = {}) {
  const queryParams: Record<string, string> = {};
  if (options.types) queryParams.types = options.types.join(',');
  if (options.tags) queryParams.tags = options.tags.join(',');
  if (options.query) queryParams.query = options.query;
  if (options.since) queryParams.since = options.since;
  if (options.sortBy) queryParams.sortBy = options.sortBy;
  if (options.sortOrder) queryParams.sortOrder = options.sortOrder;
  if (options.limit) queryParams.limit = String(options.limit);
  if (options.offset) queryParams.offset = String(options.offset);

  return useHonoQuery<NotesListOutput>(
    ['notes', 'list', options],
    async (client: HonoClient) => {
      const res = await client.api.notes.$get({
        query: queryParams,
      });
      return res.json();
    },
    {
      staleTime: 1000 * 60 * 1, // 1 minute
    },
  );
}

export function useNote(id: string) {
  return useHonoQuery<NotesGetOutput>(
    ['notes', id],
    async (client: HonoClient) => {
      const res = await client.api.notes[':id'].$get({ param: { id } });
      return res.json();
    },
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );
}

export function useCreateNote() {
  const utils = useHonoUtils();

  return useHonoMutation<NotesCreateOutput, NotesCreateInput>(
    async (client: HonoClient, variables: NotesCreateInput) => {
      const res = await client.api.notes.$post({
        json: variables,
      });
      return res.json();
    },
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
    async (client: HonoClient, variables: { id: string } & NotesUpdateInput) => {
      const { id, ...data } = variables;
      const res = await client.api.notes[':id'].$patch({
        param: { id },
        json: data,
      });
      return res.json();
    },
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
    async (client: HonoClient, variables: { id: string }) => {
      const res = await client.api.notes[':id'].$delete({
        param: { id: variables.id },
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['notes', 'list']);
      },
    },
  );
}

export function useSyncNotes() {
  const utils = useHonoUtils();

  return useHonoMutation<NotesSyncOutput, NotesSyncInput>(
    async (client: HonoClient, variables: NotesSyncInput) => {
      const res = await client.api.notes.sync.$post({
        json: variables,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['notes', 'list']);
      },
    },
  );
}
