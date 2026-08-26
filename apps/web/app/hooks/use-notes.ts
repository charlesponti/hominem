import { useApiClient } from '@hominem/rpc/react';
import type {
  NotesCreateInput,
  NotesCreateOutput,
  NotesSearchOutput,
} from '@hominem/rpc/types/notes.types';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';

import { notesQueryKeys } from '~/lib/query-keys';

export function useNoteSearch(query: string, enabled = true) {
  const client = useApiClient();

  return useInfiniteQuery<
    NotesSearchOutput,
    Error,
    NotesSearchOutput,
    readonly unknown[],
    string | null
  >({
    queryKey: notesQueryKeys.search(query),
    initialPageParam: null,
    enabled: enabled && query.trim().length > 0,
    staleTime: 1000 * 30,
    queryFn: async ({ pageParam }) => {
      const q: { query: string; limit?: string; cursor?: string } = { query, limit: '8' };
      if (pageParam) q.cursor = pageParam;
      const res = await client.api.notes.search.$get({ query: q });
      return res.json() as Promise<NotesSearchOutput>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => {
      const notes = data.pages.flatMap((page) => page.notes);
      return {
        pages: data.pages,
        pageParams: data.pageParams,
        notes,
        nextCursor: data.pages.at(-1)?.nextCursor ?? null,
      } as NotesSearchOutput & { pages: typeof data.pages; pageParams: typeof data.pageParams };
    },
  });
}

export function useCreateNote() {
  const client = useApiClient();

  return useMutation<NotesCreateOutput, Error, NotesCreateInput>({
    mutationFn: async (variables) => {
      const res = await client.api.notes.$post({ json: variables as never });
      return res.json() as Promise<NotesCreateOutput>;
    },
  });
}
