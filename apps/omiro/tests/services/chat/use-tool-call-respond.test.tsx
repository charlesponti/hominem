// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockRespond = vi.fn();

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
                'tool-calls': {
                  ':toolCallId': { respond: { $post: mockRespond } },
                },
              },
            },
          },
        },
      },
    }),
  };
});

const { useToolCallRespond } = await import('~/services/chat/use-tool-call-respond');

afterEach(() => {
  vi.clearAllMocks();
});

describe('useToolCallRespond', () => {
  it('posts the decision, drains the SSE response, and invalidates chat data', async () => {
    const text = vi.fn().mockResolvedValue('event: generation.committed\n\n');
    mockRespond.mockResolvedValueOnce({ text });
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useToolCallRespond({ chatId: 'chat-1' }),
    );
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.respond({
        messageId: 'message-1',
        toolCallId: 'call-1',
        approved: true,
      });
    });

    expect(mockRespond).toHaveBeenCalledWith({
      param: { id: 'chat-1', messageId: 'message-1', toolCallId: 'call-1' },
      json: { approved: true },
    });
    expect(text).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['chats', 'messages', { chatId: 'chat-1', limit: 50 }],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['chats', 'detail', 'chat-1'],
    });
    expect(result.current.isResponding).toBe(false);
  });

  it('resets responding state and invalidates data when the response fails', async () => {
    mockRespond.mockRejectedValueOnce(new Error('network error'));
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useToolCallRespond({ chatId: 'chat-1' }),
    );
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await expect(
        result.current.respond({
          messageId: 'message-1',
          toolCallId: 'call-1',
          approved: false,
        }),
      ).rejects.toThrow('network error');
    });

    expect(result.current.isResponding).toBe(false);
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });
});
