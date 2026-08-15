// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { MessageOutput } from '~/services/chat/chatMessages';
import { chatKeys } from '~/services/notes/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockMessagePatch = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        chats: {
          ':id': {
            messages: {
              ':messageId': {
                $patch: mockMessagePatch,
              },
            },
          },
        },
      },
    }),
  };
});

const { useEditChatMessage } = await import('~/services/chat/use-edit-message');

const CHAT_ID = 'chat-1';

function seedMessages(
  queryClient: ReturnType<typeof renderHookWithQueryClient>['queryClient'],
): MessageOutput[] {
  const messages = [
    {
      id: 'msg-1',
      role: 'user',
      message: 'original text',
      created_at: new Date().toISOString(),
      chat_id: CHAT_ID,
      profile_id: '',
      focus_ids: null,
      focus_items: null,
      reasoning: null,
      referencedNotes: null,
      toolCalls: null,
      isStreaming: false,
    },
  ] as MessageOutput[];
  queryClient.setQueryData(chatKeys.messages(CHAT_ID), messages);
  return messages;
}

describe('useEditChatMessage', () => {
  it('optimistically updates the message content before the request resolves', async () => {
    mockMessagePatch.mockImplementation(() => new Promise(() => {}));
    const { result, queryClient } = renderHookWithQueryClient(() => useEditChatMessage(CHAT_ID));
    seedMessages(queryClient);

    act(() => {
      result.current.mutate({ messageId: 'msg-1', content: 'edited text' });
    });

    await waitFor(() => {
      const messages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID));
      expect(messages?.[0]?.message).toBe('edited text');
    });
  });

  it('rolls back to the previous messages when the request fails', async () => {
    mockMessagePatch.mockRejectedValueOnce(new Error('network error'));
    const { result, queryClient } = renderHookWithQueryClient(() => useEditChatMessage(CHAT_ID));
    const original = seedMessages(queryClient);

    await act(async () => {
      await result.current
        .mutateAsync({ messageId: 'msg-1', content: 'edited text' })
        .catch(() => undefined);
    });

    const messages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(CHAT_ID));
    expect(messages).toEqual(original);
  });

  it('invalidates the messages query after the request settles, on success', async () => {
    mockMessagePatch.mockResolvedValueOnce({ json: async () => ({}) });
    const { result, queryClient } = renderHookWithQueryClient(() => useEditChatMessage(CHAT_ID));
    seedMessages(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ messageId: 'msg-1', content: 'edited text' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: chatKeys.messages(CHAT_ID) });
  });

  it('invalidates the messages query after the request settles, on error', async () => {
    mockMessagePatch.mockRejectedValueOnce(new Error('network error'));
    const { result, queryClient } = renderHookWithQueryClient(() => useEditChatMessage(CHAT_ID));
    seedMessages(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current
        .mutateAsync({ messageId: 'msg-1', content: 'edited text' })
        .catch(() => undefined);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: chatKeys.messages(CHAT_ID) });
  });

  it('sends the patch request with the chat id, message id, and new content', async () => {
    mockMessagePatch.mockResolvedValueOnce({ json: async () => ({}) });
    const { result, queryClient } = renderHookWithQueryClient(() => useEditChatMessage(CHAT_ID));
    seedMessages(queryClient);

    await act(async () => {
      await result.current.mutateAsync({ messageId: 'msg-1', content: 'edited text' });
    });

    expect(mockMessagePatch).toHaveBeenCalledWith({
      param: { id: CHAT_ID, messageId: 'msg-1' },
      json: { content: 'edited text' },
    });
  });
});
