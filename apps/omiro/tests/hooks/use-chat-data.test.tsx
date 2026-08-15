// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { chatKeys } from '~/services/notes/query-keys';

import { renderHookWithQueryClient } from '../utils/render-hook';

const mockUseChatMessages = vi.fn();
const mockChatArchiveMutate = vi.fn();
let capturedArchiveOnSuccess: (() => void) | undefined;

vi.mock('~/services/chat/use-chat-messages', () => ({
  useChatMessages: (options: unknown) => mockUseChatMessages(options),
}));

vi.mock('~/services/chat/use-chat-archive', () => ({
  useChatArchive: ({ onSuccess }: { onSuccess: () => void }) => {
    capturedArchiveOnSuccess = onSuccess;
    return { mutate: mockChatArchiveMutate, isPending: false };
  },
}));

const { useChatData } = await import('~/hooks/use-chat-data');

const CHAT_ID = 'chat-1';

function messagesQueryResult(overrides: Partial<ReturnType<typeof mockUseChatMessages>> = {}) {
  return {
    error: null,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(),
    data: undefined,
    ...overrides,
  };
}

describe('useChatData', () => {
  afterEach(() => {
    vi.clearAllMocks();
    capturedArchiveOnSuccess = undefined;
  });

  it('reports initial loading when pending with no usable data yet', () => {
    mockUseChatMessages.mockReturnValue(messagesQueryResult({ isPending: true, data: undefined }));
    const onChatArchive = vi.fn();
    const { result } = renderHookWithQueryClient(() =>
      useChatData({ chatId: CHAT_ID, onChatArchive }),
    );

    expect(result.current.isMessagesLoading).toBe(true);
    expect(result.current.isMessagesRefreshing).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  it('reports refreshing (not initial loading) when refetching with already-loaded data', () => {
    mockUseChatMessages.mockReturnValue(
      messagesQueryResult({
        isPending: false,
        isFetching: true,
        data: [{ id: 'm1' }],
      }),
    );
    const { result } = renderHookWithQueryClient(() =>
      useChatData({ chatId: CHAT_ID, onChatArchive: vi.fn() }),
    );

    expect(result.current.isMessagesLoading).toBe(false);
    expect(result.current.isMessagesRefreshing).toBe(true);
    expect(result.current.messages).toEqual([{ id: 'm1' }]);
  });

  it('falls back to an empty array when messages data is an empty list', () => {
    mockUseChatMessages.mockReturnValue(messagesQueryResult({ data: [] }));
    const { result } = renderHookWithQueryClient(() =>
      useChatData({ chatId: CHAT_ID, onChatArchive: vi.fn() }),
    );

    expect(result.current.messages).toEqual([]);
  });

  it('surfaces the messages query error', () => {
    const error = new Error('network error');
    mockUseChatMessages.mockReturnValue(messagesQueryResult({ error }));
    const { result } = renderHookWithQueryClient(() =>
      useChatData({ chatId: CHAT_ID, onChatArchive: vi.fn() }),
    );

    expect(result.current.messagesError).toBe(error);
  });

  it('archives the chat, invalidates the messages query, and calls onChatArchive on success', () => {
    mockUseChatMessages.mockReturnValue(messagesQueryResult());
    const onChatArchive = vi.fn();
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useChatData({ chatId: CHAT_ID, onChatArchive }),
    );
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => {
      result.current.handleArchiveChat();
    });

    expect(mockChatArchiveMutate).toHaveBeenCalledTimes(1);

    act(() => {
      capturedArchiveOnSuccess?.();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: chatKeys.messages(CHAT_ID),
    });
    expect(onChatArchive).toHaveBeenCalledTimes(1);
  });
});
