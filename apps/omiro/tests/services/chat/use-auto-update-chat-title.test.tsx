// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CHAT_TITLE } from '~/services/chat/chat-title';
import { chatKeys } from '~/services/notes/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockPatch = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        chats: {
          ':id': {
            $patch: mockPatch,
          },
        },
      },
    }),
  };
});

const { useAutoUpdateChatTitle } = await import('~/services/chat/use-auto-update-chat-title');

const CHAT_ID = 'chat-1';

describe('useAutoUpdateChatTitle', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when the message is empty', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useAutoUpdateChatTitle(CHAT_ID),
    );
    queryClient.setQueryData(chatKeys.activeChat(CHAT_ID), {
      id: CHAT_ID,
      title: DEFAULT_CHAT_TITLE,
    });

    await act(async () => {
      await result.current('');
    });

    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('does nothing when there is no cached chat', async () => {
    const { result } = renderHookWithQueryClient(() => useAutoUpdateChatTitle(CHAT_ID));

    await act(async () => {
      await result.current('Hello there');
    });

    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('does nothing when the chat already has a custom title', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useAutoUpdateChatTitle(CHAT_ID),
    );
    queryClient.setQueryData(chatKeys.activeChat(CHAT_ID), { id: CHAT_ID, title: 'Already named' });

    await act(async () => {
      await result.current('Hello there');
    });

    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('optimistically updates the cache and patches the server when the chat has a default title', async () => {
    mockPatch.mockResolvedValueOnce({ json: async () => ({}) });
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useAutoUpdateChatTitle(CHAT_ID),
    );
    queryClient.setQueryData(chatKeys.activeChat(CHAT_ID), {
      id: CHAT_ID,
      title: DEFAULT_CHAT_TITLE,
    });

    await act(async () => {
      await result.current('First message from the user');
    });

    expect(mockPatch).toHaveBeenCalledWith({
      param: { id: CHAT_ID },
      json: { title: 'First message from the user' },
    });

    const cached = queryClient.getQueryData<{ title: string }>(chatKeys.activeChat(CHAT_ID));
    expect(cached?.title).toBe('First message from the user');
  });

  it('leaves the title unset when the normalized title is still the default', async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useAutoUpdateChatTitle(CHAT_ID),
    );
    queryClient.setQueryData(chatKeys.activeChat(CHAT_ID), {
      id: CHAT_ID,
      title: DEFAULT_CHAT_TITLE,
    });

    await act(async () => {
      await result.current(DEFAULT_CHAT_TITLE);
    });

    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('invalidates the active chat query when the patch request fails', async () => {
    mockPatch.mockRejectedValueOnce(new Error('network error'));
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useAutoUpdateChatTitle(CHAT_ID),
    );
    queryClient.setQueryData(chatKeys.activeChat(CHAT_ID), {
      id: CHAT_ID,
      title: DEFAULT_CHAT_TITLE,
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current('First message from the user');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: chatKeys.activeChat(CHAT_ID) });
  });
});
