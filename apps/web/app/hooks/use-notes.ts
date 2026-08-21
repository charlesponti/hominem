import { useApiClient } from '@hominem/rpc/react';
import type {
  NoteFeedItem,
  NotesCreateInput,
  NotesCreateOutput,
  NotesDeleteOutput,
  NotesFeedInput,
  NotesFeedOutput,
  NotesGetOutput,
  NotesListInput,
  NotesSearchOutput,
  NotesUpdateInput,
  NotesUpdateOutput,
} from '@hominem/rpc/types/notes.types';
import { buildContentPreview } from '@hominem/utils/text';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createNotesMutationSuccessHandler,
  DEFAULT_NOTES_FEED_LIMIT,
  notesQueryKeys,
} from '~/lib/query-keys';
import { requestNotesRowExit } from '~/routes/notes/notes-surface-events';

interface UseNotesListOptions {
  enabled?: boolean;
}

export interface NotesFeedPage {
  notes: NoteFeedItem[];
  nextCursor: string | null;
}

export interface NotesFeedData {
  pages: NotesFeedPage[];
  pageParams: Array<string | null>;
}

interface CreateNoteContext {
  optimisticId: string;
  previousFeed: NotesFeedData | undefined;
}

export function flattenNoteFeedPages(data: NotesFeedData | undefined): NoteFeedItem[] {
  return (data?.pages.flatMap((page) => page.notes) ?? []).slice().reverse();
}

function buildOptimisticFeedNote(input: NotesCreateInput): NoteFeedItem {
  const now = new Date().toISOString();
  const trimmed = input.content.trim();

  return {
    id: `optimistic-note-${Date.now().toString()}`,
    title: input.title?.trim() || null,
    contentPreview: buildContentPreview(null, trimmed),
    createdAt: now,
    authorId: 'optimistic-user',
    metadata: {
      hasAttachments: Boolean(input.fileIds?.length),
    },
  };
}

function prependOptimisticFeedNote(
  current: NotesFeedData | undefined,
  optimisticNote: NoteFeedItem,
): NotesFeedData {
  if (!current || current.pages.length === 0) {
    return {
      pages: [{ notes: [optimisticNote], nextCursor: null }],
      pageParams: [null],
    };
  }

  const [firstPage, ...restPages] = current.pages;
  if (!firstPage) {
    return {
      pages: [{ notes: [optimisticNote], nextCursor: null }],
      pageParams: [null],
    };
  }

  return {
    ...current,
    pages: [{ ...firstPage, notes: [...firstPage.notes, optimisticNote] }, ...restPages],
  };
}

function removeFeedNote(
  current: NotesFeedData | undefined,
  noteId: string,
): NotesFeedData | undefined {
  if (!current) {
    return current;
  }

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      notes: page.notes.filter((note) => note.id !== noteId),
    })),
  };
}

export function useNotesList(options: NotesListInput = {}, queryOptions: UseNotesListOptions = {}) {
  const client = useApiClient();

  return useQuery({
    enabled: queryOptions.enabled ?? true,
    queryKey: notesQueryKeys.list(options),
    staleTime: 1000 * 60 * 1,
    queryFn: async () => {
      const query: {
        types?: string;
        status?: string;
        tags?: string;
        query?: string;
        since?: string;
        sortBy?: 'createdAt' | 'updatedAt' | 'title';
        sortOrder?: 'asc' | 'desc';
        limit?: string;
        offset?: string;
        includeAllVersions?: string;
      } = {};
      if (options.types?.length) query.types = options.types.join(',');
      if (options.status?.length) query.status = options.status.join(',');
      if (options.tags?.length) query.tags = options.tags.join(',');
      if (options.query) query.query = options.query;
      if (options.since) query.since = options.since;
      if (options.sortBy) query.sortBy = options.sortBy;
      if (options.sortOrder) query.sortOrder = options.sortOrder;
      if (options.limit != null) query.limit = String(options.limit);
      if (options.offset != null) query.offset = String(options.offset);
      if (options.includeAllVersions != null)
        query.includeAllVersions = String(options.includeAllVersions);
      const res = await client.api.notes.$get({ query });
      const data = await res.json();
      return Array.isArray(data.notes) ? data.notes : [];
    },
  });
}

interface UseNotesFeedOptions extends UseNotesListOptions {
  initialData?: NotesFeedData;
}

export function useNotesFeed(
  options: Omit<NotesFeedInput, 'cursor'> = {},
  queryOptions: UseNotesFeedOptions = {},
) {
  const client = useApiClient();
  const limit = options.limit ?? DEFAULT_NOTES_FEED_LIMIT;

  return useInfiniteQuery<NotesFeedOutput, Error, NotesFeedData, readonly unknown[], string | null>(
    {
      queryKey: notesQueryKeys.feed({ limit }),
      initialPageParam: null,
      queryFn: async ({ pageParam }) => {
        const query: { limit: string; cursor?: string } = { limit: String(limit) };
        if (pageParam) query.cursor = pageParam;
        const res = await client.api.notes.feed.$get({ query });
        return res.json() as Promise<NotesFeedOutput>;
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: queryOptions.enabled ?? true,
      staleTime: 1000 * 30,
      ...(queryOptions.initialData ? { initialData: queryOptions.initialData } : {}),
    },
  );
}

export function useNote(id: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: notesQueryKeys.detail(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    queryFn: () =>
      client.api.notes[':id']
        .$get({ param: { id } })
        .then((r) => r.json() as Promise<NotesGetOutput>),
  });
}

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
  const queryClient = useQueryClient();

  return useMutation<NotesCreateOutput, Error, NotesCreateInput, CreateNoteContext>({
    mutationFn: async (variables) => {
      const res = await client.api.notes.$post({ json: variables as never });
      return res.json() as Promise<NotesCreateOutput>;
    },
    onMutate: async (variables) => {
      const optimisticNote = buildOptimisticFeedNote(variables);
      const feedQueryKey = notesQueryKeys.feed({ limit: DEFAULT_NOTES_FEED_LIMIT });

      await queryClient.cancelQueries({ queryKey: feedQueryKey });
      const previousFeed = queryClient.getQueryData<NotesFeedData>(feedQueryKey);

      queryClient.setQueryData<NotesFeedData>(feedQueryKey, (current) =>
        prependOptimisticFeedNote(current, optimisticNote),
      );

      return {
        optimisticId: optimisticNote.id,
        previousFeed,
      };
    },
    onError: (_error, _variables, context) => {
      const feedQueryKey = notesQueryKeys.feed({ limit: DEFAULT_NOTES_FEED_LIMIT });
      queryClient.setQueryData(feedQueryKey, context?.previousFeed);
    },
    onSuccess: async (createdNote, _variables, context) => {
      if (context?.optimisticId) {
        await requestNotesRowExit(context.optimisticId);
      }
      queryClient.setQueryData(notesQueryKeys.detail(createdNote.id), createdNote);
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.feeds() });
    },
  });
}

export function useUpdateNote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<NotesUpdateOutput, Error, { id: string } & NotesUpdateInput>({
    mutationFn: async (variables) => {
      const { id, ...fields } = variables;
      const res = await client.api.notes[':id'].$patch({
        param: { id },
        json: fields as never,
      });
      return res.json() as Promise<NotesUpdateOutput>;
    },
    onSuccess: (data) => {
      createNotesMutationSuccessHandler(queryClient, data.id);
    },
  });
}

export function useDeleteNote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    NotesDeleteOutput,
    Error,
    { id: string },
    { previousFeed: NotesFeedData | undefined }
  >({
    mutationFn: async (variables) => {
      const res = await client.api.notes[':id'].$delete({ param: { id: variables.id } });
      return res.json() as Promise<NotesDeleteOutput>;
    },
    onMutate: async (variables) => {
      const feedQueryKey = notesQueryKeys.feed({ limit: DEFAULT_NOTES_FEED_LIMIT });
      await queryClient.cancelQueries({ queryKey: feedQueryKey });
      const previousFeed = queryClient.getQueryData<NotesFeedData>(feedQueryKey);

      await requestNotesRowExit(variables.id);
      queryClient.setQueryData<NotesFeedData>(feedQueryKey, (current) =>
        removeFeedNote(current, variables.id),
      );

      return { previousFeed };
    },
    onError: (_error, _variables, context) => {
      const feedQueryKey = notesQueryKeys.feed({ limit: DEFAULT_NOTES_FEED_LIMIT });
      queryClient.setQueryData(feedQueryKey, context?.previousFeed);
    },
    onSuccess: async (_, variables) => {
      await createNotesMutationSuccessHandler(queryClient, variables.id);
    },
  });
}
