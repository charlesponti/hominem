// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { noteKeys } from '~/services/notes/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockPost = vi.fn();
const mockInvalidateInboxQueries = vi.fn().mockResolvedValue(undefined);

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        notes: {
          $post: mockPost,
        },
      },
    }),
  };
});

vi.mock('~/services/inbox/inbox-refresh', () => ({
  invalidateInboxQueries: mockInvalidateInboxQueries,
}));

const { useCreateNote } = await import('~/services/notes/use-create-note');

afterEach(() => {
  vi.clearAllMocks();
});

describe('useCreateNote', () => {
  it('optimistically inserts a draft note then replaces it with the server response', async () => {
    const createdNote = {
      id: 'note-server-1',
      title: null,
      content: 'Hello there',
      status: 'draft',
      type: 'note',
    };
    mockPost.mockResolvedValueOnce({ json: async () => createdNote });

    const { result, queryClient } = renderHookWithQueryClient(() => useCreateNote());

    let mutatePromise: Promise<unknown> | undefined;
    act(() => {
      mutatePromise = result.current.mutateAsync({ text: 'Hello there' });
    });

    await act(async () => {
      await mutatePromise;
    });

    expect(mockPost).toHaveBeenCalledWith({
      json: { content: 'Hello there', type: 'note' },
    });
    expect(queryClient.getQueryData(noteKeys.detail('note-server-1'))).toEqual(createdNote);
    expect(mockInvalidateInboxQueries).toHaveBeenCalledWith(queryClient);
    expect(findOptimisticNoteQueries(queryClient)).toHaveLength(0);
  });

  it('includes fileIds only when provided', async () => {
    mockPost.mockResolvedValueOnce({ json: async () => ({ id: 'note-1' }) });
    const { result } = renderHookWithQueryClient(() => useCreateNote());

    await act(async () => {
      await result.current.mutateAsync({ text: 'With files', fileIds: ['file-1', 'file-2'] });
    });

    expect(mockPost).toHaveBeenCalledWith({
      json: { content: 'With files', fileIds: ['file-1', 'file-2'], type: 'note' },
    });
  });

  it('removes the optimistic entry without invalidating the inbox when the request fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('network error'));
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateNote());

    await act(async () => {
      await result.current.mutateAsync({ text: 'Fails' }).catch(() => undefined);
    });

    expect(mockInvalidateInboxQueries).not.toHaveBeenCalled();
    expect(findOptimisticNoteQueries(queryClient)).toHaveLength(0);
  });
});

function findOptimisticNoteQueries(
  queryClient: ReturnType<typeof renderHookWithQueryClient>['queryClient'],
) {
  return queryClient
    .getQueryCache()
    .getAll()
    .filter((query) => {
      const key = query.queryKey as unknown[];
      return typeof key[2] === 'string' && (key[2] as string).startsWith('optimistic-note-');
    });
}
