// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { chatKeys } from '~/services/notes/query-keys';

import { renderHookWithQueryClient } from '../utils/render-hook';

const mockChatsListGet = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        chats: {
          $get: mockChatsListGet,
        },
      },
    }),
  };
});

const { useArchivedChats } = await import('~/hooks/useArchivedChats');

function chatFixture(overrides: Record<string, unknown>) {
  return {
    id: 'chat-1',
    archivedAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('useArchivedChats', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHookWithQueryClient(() => useArchivedChats({ enabled: false }));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockChatsListGet).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it('fetches archived chats, seeds per-chat detail cache, and resolves the composed list', async () => {
    mockChatsListGet.mockResolvedValueOnce({
      json: async () => [
        chatFixture({ id: 'archived-1' }),
        chatFixture({ id: 'active-1', archivedAt: null }),
      ],
    });

    const { result, queryClient } = renderHookWithQueryClient(() => useArchivedChats());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]?.id).toBe('archived-1');
    expect(queryClient.getQueryData(chatKeys.detail('archived-1'))).toEqual(
      expect.objectContaining({ id: 'archived-1' }),
    );
  });

  it('returns an empty list while the archived index has not resolved yet', () => {
    mockChatsListGet.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHookWithQueryClient(() => useArchivedChats());

    expect(result.current.data).toEqual([]);
    expect(result.current.isPending).toBe(true);
  });

  it('surfaces a fetch error', async () => {
    mockChatsListGet.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHookWithQueryClient(() => useArchivedChats());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
