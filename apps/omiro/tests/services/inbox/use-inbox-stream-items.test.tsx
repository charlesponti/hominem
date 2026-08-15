// @vitest-environment jsdom
import type { InboxOutput } from '@hominem/rpc/types';
import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { inboxKeys } from '~/services/notes/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockGet = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        inbox: {
          $get: mockGet,
        },
      },
    }),
  };
});

const { useInboxStreamItems } = await import('~/services/inbox/use-inbox-stream-items');

afterEach(() => {
  vi.clearAllMocks();
});

function page(overrides: Partial<InboxOutput> = {}): InboxOutput {
  return {
    items: [
      {
        id: 'event-1',
        kind: 'note',
        entityId: 'note-1',
        title: 'First note',
        preview: 'Preview text',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ],
    nextCursor: null,
    ...overrides,
  } as InboxOutput;
}

describe('useInboxStreamItems', () => {
  it('fetches the first page and returns hydrated view models', async () => {
    mockGet.mockResolvedValueOnce({ json: async () => page() });

    const { result } = renderHookWithQueryClient(() => useInboxStreamItems());

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    expect(mockGet).toHaveBeenCalledWith({ query: { limit: '50' } });
    expect(result.current.items).toEqual([
      expect.objectContaining({
        kind: 'note',
        entityId: 'note-1',
        title: 'First note',
        preview: 'Preview text',
      }),
    ]);
  });

  it('does not fetch when disabled', () => {
    renderHookWithQueryClient(() => useInboxStreamItems({ enabled: false }));

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('requests the next page using the cursor and appends results', async () => {
    mockGet.mockResolvedValueOnce({
      json: async () => page({ nextCursor: 'cursor-1' }),
    });

    const { result } = renderHookWithQueryClient(() => useInboxStreamItems());
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(true);

    mockGet.mockResolvedValueOnce({
      json: async () =>
        page({
          items: [
            {
              id: 'event-2',
              kind: 'note',
              entityId: 'note-2',
              title: 'Second note',
              preview: 'Preview 2',
              updatedAt: '2026-07-02T00:00:00.000Z',
            },
          ],
          nextCursor: null,
        }),
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockGet).toHaveBeenLastCalledWith({ query: { limit: '50', cursor: 'cursor-1' } });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((item) => item.entityId)).toEqual(['note-1', 'note-2']);
  });

  it('surfaces query errors', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHookWithQueryClient(() => useInboxStreamItems());

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
  });

  it('indexes fetched pages into the shared inbox query key', async () => {
    mockGet.mockResolvedValueOnce({ json: async () => page() });

    const { queryClient } = renderHookWithQueryClient(() => useInboxStreamItems());

    await waitFor(() =>
      expect(queryClient.getQueryData(inboxKeys.page({ limit: 50 }))).toBeDefined(),
    );
  });
});
