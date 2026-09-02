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
          ':messageId': {
            'tool-calls': { ':toolCallId': { respond: { $post: vi.fn() } } },
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

import { useToolCallRespond } from './use-tool-call-respond';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useToolCallRespond', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['approval', true],
    ['rejection', false],
  ])('drains the %s SSE response and refreshes durable state', async (_label, approved) => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    mockClient.api.chats[':id'].messages[':messageId']['tool-calls'][
      ':toolCallId'
    ].respond.$post.mockResolvedValueOnce(
      new Response('data: [DONE]\n\n', {
        headers: { 'content-type': 'text/event-stream' },
      }),
    );

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

    expect(
      mockClient.api.chats[':id'].messages[':messageId']['tool-calls'][':toolCallId'].respond.$post,
    ).toHaveBeenCalledWith({
      param: { id: 'chat-1', messageId: 'message-1', toolCallId: 'tool-1' },
      json: { approved },
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(result.current.isResponding).toBe(false);
  });

  it('refreshes durable state and resets lifecycle state when the request fails', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const error = new Error('request failed');
    mockClient.api.chats[':id'].messages[':messageId']['tool-calls'][
      ':toolCallId'
    ].respond.$post.mockRejectedValueOnce(error);

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
