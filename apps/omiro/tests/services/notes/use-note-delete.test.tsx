// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { inboxEntityKeys } from '~/services/inbox/inbox-entities';
import { inboxKeys, noteKeys } from '~/services/notes/query-keys';

import { mockMmkvModule } from '../../mocks/mmkv';
import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockDelete = vi.fn();

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        notes: {
          ':id': {
            $delete: mockDelete,
          },
        },
      },
    }),
  };
});

const { useNoteDelete } = await import('~/services/notes/use-note-delete');
const { readResumeTarget, writeResumeTarget } = await import('~/services/navigation/launch-state');

afterEach(() => {
  vi.clearAllMocks();
});

const NOTE_ID = 'note-1';

function seedInboxPages(queryClient: import('@tanstack/react-query').QueryClient) {
  queryClient.setQueryData(inboxEntityKeys.all, {
    'note:note-1': { id: 'note:note-1', entityId: NOTE_ID, kind: 'note' },
  });
  queryClient.setQueryData(inboxKeys.page({ limit: 50 }), {
    pageParams: [null],
    pages: [{ itemIds: ['note:note-1'], nextCursor: null }],
  });
}

describe('useNoteDelete', () => {
  it('optimistically removes the note from cached inbox pages and clears its detail cache on success', async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useNoteDelete({ noteId: NOTE_ID }),
    );
    seedInboxPages(queryClient);
    queryClient.setQueryData(noteKeys.detail(NOTE_ID), { id: NOTE_ID });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockDelete).toHaveBeenCalledWith({ param: { id: NOTE_ID } });
    const page = queryClient.getQueryData<{ pages: { itemIds: string[] }[] }>(
      inboxKeys.page({ limit: 50 }),
    );
    expect(page?.pages[0]?.itemIds).toEqual([]);
    expect(queryClient.getQueryData(noteKeys.detail(NOTE_ID))).toBeUndefined();
  });

  it('restores the previous inbox pages when the delete request fails', async () => {
    mockDelete.mockRejectedValueOnce(new Error('network error'));
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useNoteDelete({ noteId: NOTE_ID }),
    );
    seedInboxPages(queryClient);

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    const page = queryClient.getQueryData<{ pages: { itemIds: string[] }[] }>(
      inboxKeys.page({ limit: 50 }),
    );
    expect(page?.pages[0]?.itemIds).toEqual(['note:note-1']);
  });

  it('clears the resume target when the deleted note was the active resume target', async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    writeResumeTarget({ kind: 'note', id: NOTE_ID, title: 'Note', updatedAt: null });
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useNoteDelete({ noteId: NOTE_ID }),
    );
    seedInboxPages(queryClient);

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(readResumeTarget()).toBeNull();
  });

  it('leaves an unrelated resume target untouched', async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    writeResumeTarget({ kind: 'note', id: 'other-note', title: 'Other', updatedAt: null });
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useNoteDelete({ noteId: NOTE_ID }),
    );
    seedInboxPages(queryClient);

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(readResumeTarget()?.id).toBe('other-note');
  });
});
