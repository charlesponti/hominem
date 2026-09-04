// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransport = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@hominem/chat/transport/fetch', () => ({
  fetchChatTransport: () => mockTransport,
}));

import { useToolCallRespond } from './use-tool-call-respond';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useToolCallRespond', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransport.request.mockResolvedValue(
      new Response('data: [DONE]\n\n', {
        headers: { 'content-type': 'text/event-stream' },
      }),
    );
  });

  it.each([
    ['approval', true],
    ['rejection', false],
  ])('drains the %s SSE response and refreshes durable state', async (_label, approved) => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const { result } = renderHook(() => useToolCallRespond({ chatId: 'chat-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.respond({
        messageId: 'message-1',
        toolCallId: 'tool-1',
        approved,
      });
    });

    expect(mockTransport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining(
          '/api/chats/chat-1/messages/message-1/tool-calls/tool-1/respond',
        ),
        init: expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(`"approved":${approved}`),
        }),
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(result.current.isResponding).toBe(false);
  });

  it('refreshes durable state and resets lifecycle state when the request fails', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const error = new Error('request failed');
    mockTransport.request.mockRejectedValue(error);

    const { result } = renderHook(() => useToolCallRespond({ chatId: 'chat-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      act(() =>
        result.current.respond({ messageId: 'message-1', toolCallId: 'tool-1', approved: true }),
      ),
    ).rejects.toThrow('request failed');
    await waitFor(() => expect(result.current.isResponding).toBe(false));
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });
});
