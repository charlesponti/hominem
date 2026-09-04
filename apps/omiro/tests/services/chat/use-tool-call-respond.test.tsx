// @vitest-environment jsdom
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockTransport = { request: vi.fn() };
const mockGetAuthHeaders = vi.fn().mockResolvedValue({ cookie: 'session=test' });

vi.mock('~/services/auth/auth-provider', () => ({
  useAuth: () => ({ getAuthHeaders: mockGetAuthHeaders }),
}));
vi.mock('~/constants', () => ({ API_BASE_URL: 'http://localhost:4040' }));
vi.mock('@hominem/chat/transport/xhr', () => ({
  xhrChatTransport: () => mockTransport,
}));

const { useToolCallRespond } = await import('~/services/chat/use-tool-call-respond');

afterEach(() => {
  vi.clearAllMocks();
  mockTransport.request.mockReset();
});

describe('useToolCallRespond', () => {
  it('posts the decision, drains the SSE response, and invalidates chat data', async () => {
    mockTransport.request.mockResolvedValueOnce(new Response('data: [DONE]\n\n'));
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

    expect(mockTransport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:4040/api/chats/chat-1/messages/message-1/tool-calls/call-1/respond',
        init: expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"approved":true'),
        }),
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['chats', 'messages', { chatId: 'chat-1', limit: 50 }],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['chats', 'detail', 'chat-1'],
    });
    expect(result.current.isResponding).toBe(false);
  });

  it('resets responding state and invalidates data when the response fails', async () => {
    mockTransport.request.mockRejectedValue(new Error('network error'));
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
