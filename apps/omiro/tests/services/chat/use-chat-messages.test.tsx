// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessageItem } from '~/components/chat';

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

const { useChatMessages, useActiveChat, preserveRenderKeys, toMessageOutput } =
  await import('~/services/chat/use-chat-messages');

const CHAT_ID = 'chat-1';

type RpcChatMessageFixture = Parameters<typeof toMessageOutput>[0];

function messageFixture(overrides: Partial<RpcChatMessageFixture> = {}): RpcChatMessageFixture {
  return {
    id: 'message-1',
    chatId: CHAT_ID,
    userId: 'user-1',
    role: 'assistant',
    content: '',
    files: null,
    toolCalls: null,
    reasoning: null,
    parentMessageId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('toMessageOutput', () => {
  it('returns null for tool messages', () => {
    expect(toMessageOutput(messageFixture({ id: 'm1', role: 'tool' }))).toBeNull();
  });

  it('maps the audio file when present', () => {
    const output = toMessageOutput(
      messageFixture({
        id: 'm1',
        content: 'hi',
        files: [{ type: 'audio', url: 'https://example.com/a.mp3', mimeType: 'audio/mpeg' }],
      }),
    );

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
        messageFixture({ id: 'm1', role: 'user', content: 'hi' }),
        messageFixture({ id: 'm2', role: 'tool', content: 'tool output' }),
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

  it('keeps the optimistic render key when the server assigns a message id', () => {
    const previous: ChatMessageItem = {
      id: 'optimistic-assistant',
      renderKey: 'optimistic-assistant',
      role: 'assistant',
      message: 'hi',
      createdAt: new Date().toISOString(),
      chatId: CHAT_ID,
      toolCalls: null,
      isStreaming: false,
    };
    const next = toMessageOutput(messageFixture({ id: 'server-assistant', content: 'hi' }));
    if (!next) {
      throw new Error('Expected assistant message output');
    }

    expect(preserveRenderKeys([next], [previous])).toMatchObject([
      {
        id: 'server-assistant',
        renderKey: 'optimistic-assistant',
      },
    ]);
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

  it('does not fetch when chatId is null', () => {
    const { result } = renderHookWithQueryClient(() => useActiveChat(null));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockChatGet).not.toHaveBeenCalled();
    expect(mockChatsListGet).not.toHaveBeenCalled();
  });
});
