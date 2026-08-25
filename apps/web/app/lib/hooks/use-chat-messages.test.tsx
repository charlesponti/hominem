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

const messages = [
  { id: 'user-1', role: 'user', content: 'First' },
  { id: 'user-2', role: 'user', content: 'Delete from here' },
  { id: 'assistant-2', role: 'assistant', content: 'Later answer' },
] as ChatMessageView[];

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useChatMessages deletion', () => {
  beforeEach(() => {
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
});
