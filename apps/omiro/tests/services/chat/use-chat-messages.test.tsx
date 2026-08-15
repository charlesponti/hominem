// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockChatMessagesGet = vi.fn();
const mockChatGet = vi.fn();
const mockChatsListGet = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        chats: {
          $get: mockChatsListGet,
          ':id': {
            $get: mockChatGet,
            messages: {
              $get: mockChatMessagesGet,
            },
          },
        },
      },
    }),
  };
});

const { useChatMessages, useActiveChat, toMessageOutput } =
  await import('~/services/chat/use-chat-messages');

const CHAT_ID = 'chat-1';

type RpcChatMessageFixture = Parameters<typeof toMessageOutput>[0];

describe('toMessageOutput', () => {
  it('returns null for tool messages', () => {
    expect(
      toMessageOutput({
        id: 'm1',
        role: 'tool',
        content: '',
        createdAt: new Date().toISOString(),
        chatId: CHAT_ID,
      } as RpcChatMessageFixture),
    ).toBeNull();
  });

  it('maps the audio file when present', () => {
    const output = toMessageOutput({
      id: 'm1',
      role: 'assistant',
      content: 'hi',
      createdAt: new Date().toISOString(),
      chatId: CHAT_ID,
      reasoning: null,
      referencedNotes: null,
      toolCalls: null,
      files: [{ type: 'audio', url: 'https://example.com/a.mp3', mimeType: 'audio/mpeg' }],
    } as RpcChatMessageFixture);

    expect(output?.audio).toEqual({ url: 'https://example.com/a.mp3', mimeType: 'audio/mpeg' });
  });
});

describe('useChatMessages', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches, converts, and drops tool messages', async () => {
    mockChatMessagesGet.mockResolvedValueOnce({
      json: async () => [
        {
          id: 'm1',
          role: 'user',
          content: 'hi',
          createdAt: new Date().toISOString(),
          chatId: CHAT_ID,
        },
        {
          id: 'm2',
          role: 'tool',
          content: 'tool output',
          createdAt: new Date().toISOString(),
          chatId: CHAT_ID,
        },
      ],
    });

    const { result } = renderHookWithQueryClient(() => useChatMessages({ chatId: CHAT_ID }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe('m1');
    expect(mockChatMessagesGet).toHaveBeenCalledWith({
      param: { id: CHAT_ID },
      query: { limit: '50' },
    });
  });

  it('does not fetch when chatId is empty', async () => {
    const { result } = renderHookWithQueryClient(() => useChatMessages({ chatId: '' }));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockChatMessagesGet).not.toHaveBeenCalled();
  });

  it('surfaces a query error', async () => {
    mockChatMessagesGet.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHookWithQueryClient(() => useChatMessages({ chatId: CHAT_ID }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('network error');
  });
});

describe('useActiveChat', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a chat by id and strips the messages field', async () => {
    mockChatGet.mockResolvedValueOnce({
      json: async () => ({ id: CHAT_ID, title: 'A chat', messages: [{ id: 'm1' }] }),
    });

    const { result } = renderHookWithQueryClient(() => useActiveChat(CHAT_ID));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: CHAT_ID, title: 'A chat' });
  });

  it('falls back to selecting from the chat list when the query is force-refetched with no chatId', async () => {
    mockChatsListGet.mockResolvedValueOnce({
      json: async () => [
        { id: 'archived', archivedAt: new Date().toISOString() },
        { id: 'active', archivedAt: null },
      ],
    });

    const { result } = renderHookWithQueryClient(() => useActiveChat());
    expect(result.current.fetchStatus).toBe('idle');

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 'active', archivedAt: null });
  });

  it('does not fetch when chatId is null', () => {
    const { result } = renderHookWithQueryClient(() => useActiveChat(null));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockChatGet).not.toHaveBeenCalled();
    expect(mockChatsListGet).not.toHaveBeenCalled();
  });
});
