// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockClient = vi.hoisted(() => ({
  api: {
    chats: {
      $post: vi.fn(),
      ':id': { $patch: vi.fn(), archive: { $post: vi.fn() } },
    },
  },
}));

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => mockClient,
}));

import { useArchiveChat, useCreateChat, useUpdateChatTitle } from './use-chats';

const chats = [
  { id: 'chat-1', title: 'One', archivedAt: null },
  { id: 'chat-2', title: 'Two', archivedAt: null },
];

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useArchiveChat', () => {
  it('removes the chat optimistically and restores it when archiving fails', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    queryClient.setQueryData(['chats', 'list'], chats);
    mockClient.api.chats[':id'].archive.$post.mockRejectedValueOnce(new Error('Archive failed'));

    const { result } = renderHook(() => useArchiveChat({}), {
      wrapper: createWrapper(queryClient),
    });
    result.current.mutate({ chatId: 'chat-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(['chats', 'list'])).toEqual(chats);
  });
});

describe('useCreateChat', () => {
  it('runs the caller success callback without waiting for list invalidation', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    queryClient.setQueryData(['chats', 'list'], chats);
    mockClient.api.chats.$post.mockResolvedValueOnce({
      json: () => Promise.resolve({ id: 'chat-3', title: 'Three', archivedAt: null }),
    });
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useCreateChat(), {
      wrapper: createWrapper(queryClient),
    });
    result.current.mutate({ title: 'Three' }, { onSuccess });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]?.[0]).toEqual({
      id: 'chat-3',
      title: 'Three',
      archivedAt: null,
    });
  });
});

describe('useUpdateChatTitle', () => {
  it('updates the list cache optimistically and rolls it back on failure', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    queryClient.setQueryData(['chats', 'list'], chats);
    let rejectUpdate!: (error: Error) => void;
    mockClient.api.chats[':id'].$patch.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectUpdate = reject;
      }),
    );

    const { result } = renderHook(() => useUpdateChatTitle(), {
      wrapper: createWrapper(queryClient),
    });
    result.current.mutate({ chatId: 'chat-1', title: 'Updated title' });
    await waitFor(() =>
      expect(queryClient.getQueryData(['chats', 'list'])).toEqual([
        { ...chats[0], title: 'Updated title' },
        chats[1],
      ]),
    );

    rejectUpdate(new Error('Update failed'));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(['chats', 'list'])).toEqual(chats);
  });
});
