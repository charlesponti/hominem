// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockClient = vi.hoisted(() => ({
  api: {
    chats: {
      ':id': {
        messages: {
          $get: vi.fn(),
          ':messageId': {
            $patch: vi.fn(),
            $delete: vi.fn(),
          },
        },
      },
    },
  },
}));

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => mockClient,
}));

import type { ChatMessageView } from '~/lib/types/chat';

import { useChatMessages } from './use-chat-messages';

const messageSeeds: Array<Pick<ChatMessageView, 'id' | 'role' | 'content'>> = [
  { id: 'user-1', role: 'user', content: 'First' },
  { id: 'user-2', role: 'user', content: 'Delete from here' },
  { id: 'assistant-2', role: 'assistant', content: 'Later answer' },
];

const messages = messageSeeds.map(
  (message) =>
    ({
      ...message,
      chatId: 'chat-1',
      userId: 'user-1',
      files: null,
      toolCalls: null,
      reasoning: null,
      parentMessageId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }) satisfies ChatMessageView,
);

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useChatMessages deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.api.chats[':id'].messages.$get.mockResolvedValue({
      ok: true,
      json: async () => messages,
    });
  });

  it('removes the target and later messages optimistically', async () => {
    let resolveDelete: (response: Response) => void = () => undefined;
    mockClient.api.chats[':id'].messages[':messageId'].$delete.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const queryClient = new QueryClient();
    const { result } = renderHook(
      () => useChatMessages({ chatId: 'chat-1', initialData: messages }),
      { wrapper: createWrapper(queryClient) },
    );

    let pendingDelete: Promise<void> | undefined;
    await act(async () => {
      pendingDelete = result.current.deleteMessage('user-2');
    });

    await waitFor(() =>
      expect(result.current.messages.map((message) => message.id)).toEqual(['user-1']),
    );
    resolveDelete(new Response(JSON.stringify({ deletedMessageIds: ['user-2', 'assistant-2'] })));
    await pendingDelete;
  });

  it('restores the exact message list when deletion fails', async () => {
    mockClient.api.chats[':id'].messages[':messageId'].$delete.mockRejectedValueOnce(
      new Error('Unable to delete this message.'),
    );
    const queryClient = new QueryClient();
    const { result } = renderHook(
      () => useChatMessages({ chatId: 'chat-1', initialData: messages }),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await expect(result.current.deleteMessage('user-2')).rejects.toThrow(
        'Unable to delete this message.',
      );
    });

    await waitFor(() =>
      expect(result.current.messages.map((message) => message.id)).toEqual([
        'user-1',
        'user-2',
        'assistant-2',
      ]),
    );
  });

  it('updates a message optimistically and sends trimmed content', async () => {
    let resolvePatch: (response: Response) => void = () => undefined;
    mockClient.api.chats[':id'].messages[':messageId'].$patch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePatch = resolve;
      }),
    );
    const queryClient = new QueryClient();
    const { result } = renderHook(
      () => useChatMessages({ chatId: 'chat-1', initialData: messages }),
      { wrapper: createWrapper(queryClient) },
    );

    let pendingUpdate: Promise<void> | undefined;
    await act(async () => {
      pendingUpdate = result.current.updateMessage('user-1', '  Updated  ');
    });

    await waitFor(() => expect(result.current.messages[0]?.content).toBe('Updated'));
    resolvePatch(new Response(JSON.stringify(messages[0]), { status: 200 }));
    await pendingUpdate;

    expect(mockClient.api.chats[':id'].messages[':messageId'].$patch).toHaveBeenCalledWith({
      param: { id: 'chat-1', messageId: 'user-1' },
      json: { content: 'Updated' },
    });
  });

  it('rejects empty message updates before calling the API', async () => {
    mockClient.api.chats[':id'].messages[':messageId'].$patch.mockClear();
    const { result } = renderHook(
      () => useChatMessages({ chatId: 'chat-1', initialData: messages }),
      { wrapper: createWrapper(new QueryClient()) },
    );

    await act(async () => {
      await expect(result.current.updateMessage('user-1', '   ')).rejects.toThrow(
        'Message content cannot be empty.',
      );
    });
    expect(mockClient.api.chats[':id'].messages[':messageId'].$patch).not.toHaveBeenCalled();
  });

  it('rolls back an optimistic update when the server rejects it', async () => {
    mockClient.api.chats[':id'].messages[':messageId'].$patch.mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );
    const queryClient = new QueryClient();
    const { result } = renderHook(
      () => useChatMessages({ chatId: 'chat-1', initialData: messages }),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await expect(result.current.updateMessage('user-1', 'Updated')).rejects.toThrow(
        'Unable to update this message.',
      );
    });
    expect(result.current.messages[0]?.content).toBe('First');
  });

  it('handles a nonnumeric status on a query error', async () => {
    mockClient.api.chats[':id'].messages.$get.mockRejectedValueOnce(
      Object.assign(new Error('unexpected response'), { status: 'unknown' }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useChatMessages({ chatId: 'chat-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error?.message).toBe('unexpected response'));
    expect(result.current.isNotFound).toBe(false);
  });

  it('does not remove a message when the delete target is absent', async () => {
    mockClient.api.chats[':id'].messages[':messageId'].$delete.mockResolvedValueOnce(
      new Response(JSON.stringify({ deletedMessageIds: [] }), { status: 200 }),
    );
    const queryClient = new QueryClient();
    const { result } = renderHook(
      () => useChatMessages({ chatId: 'chat-1', initialData: messages }),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => result.current.deleteMessage('missing'));

    expect(result.current.messages).toEqual(messages);
  });

  it('rejects a delete when the server returns a failure response', async () => {
    mockClient.api.chats[':id'].messages[':messageId'].$delete.mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );
    const { result } = renderHook(
      () => useChatMessages({ chatId: 'chat-1', initialData: messages }),
      { wrapper: createWrapper(new QueryClient()) },
    );

    await act(async () => {
      await expect(result.current.deleteMessage('user-2')).rejects.toThrow(
        'Unable to delete this message.',
      );
    });
  });

  it('does not attempt an update rollback when no cached messages exist', async () => {
    mockClient.api.chats[':id'].messages[':messageId'].$patch.mockRejectedValueOnce(
      new Error('network error'),
    );
    const { result } = renderHook(() => useChatMessages({ chatId: '' }), {
      wrapper: createWrapper(new QueryClient()),
    });

    await act(async () => {
      await expect(result.current.updateMessage('missing', 'Updated')).rejects.toThrow(
        'network error',
      );
    });
  });

  it('does not attempt a delete rollback when no cached messages exist', async () => {
    mockClient.api.chats[':id'].messages[':messageId'].$delete.mockRejectedValueOnce(
      new Error('network error'),
    );
    const { result } = renderHook(() => useChatMessages({ chatId: '' }), {
      wrapper: createWrapper(new QueryClient()),
    });

    await act(async () => {
      await expect(result.current.deleteMessage('missing')).rejects.toThrow('network error');
    });
  });

  it('ignores a second delete while the first delete is pending', async () => {
    let resolveDelete: (response: Response) => void = () => undefined;
    mockClient.api.chats[':id'].messages[':messageId'].$delete.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const queryClient = new QueryClient();
    const { result } = renderHook(
      () => useChatMessages({ chatId: 'chat-1', initialData: messages }),
      { wrapper: createWrapper(queryClient) },
    );

    let firstDelete: Promise<void> | undefined;
    await act(async () => {
      firstDelete = result.current.deleteMessage('user-2');
    });
    await waitFor(() => expect(result.current.isDeleting).toBe(true));
    await act(async () => result.current.deleteMessage('assistant-2'));
    expect(mockClient.api.chats[':id'].messages[':messageId'].$delete).toHaveBeenCalledTimes(1);

    resolveDelete(new Response(JSON.stringify({ deletedMessageIds: ['user-2'] }), { status: 200 }));
    await firstDelete;
  });

  it('marks a not-found query error and exposes retry', async () => {
    mockClient.api.chats[':id'].messages.$get.mockResolvedValueOnce(
      new Response(null, { status: 404 }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useChatMessages({ chatId: 'chat-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isNotFound).toBe(true));
    expect(result.current.error?.message).toBe('Unable to load this conversation.');
    expect(result.current.messages).toEqual([]);
  });
});
