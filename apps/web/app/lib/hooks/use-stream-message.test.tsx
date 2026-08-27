// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockClient = vi.hoisted(() => ({
  api: {
    chats: {
      ':id': {
        stream: { $post: vi.fn() },
        generations: { ':generationId': { cancel: { $post: vi.fn() } } },
      },
    },
  },
}));

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => mockClient,
}));

import { useStreamMessage } from './use-stream-message';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

function streamResponse(events: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      events.forEach((event) => controller.enqueue(encoder.encode(`data: ${event}\n`)));
      controller.close();
    },
  });
  return new Response(body);
}

describe('useStreamMessage', () => {
  it('passes the abort signal and records a committed response', async () => {
    mockClient.api.chats[':id'].stream.$post.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({ type: 'status', generationId: 'g1', status: 'preparing' }),
        JSON.stringify({
          type: 'committed',
          generationId: 'g1',
          message: { id: 'm1', chatId: 'chat-1', content: 'Done' },
        }),
      ]),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.stream({ message: 'Hello' });
    await waitFor(() => expect(result.current.status).toBe('committed'));

    const [, options] = mockClient.api.chats[':id'].stream.$post.mock.calls[0] as [
      unknown,
      { init: RequestInit },
    ];
    expect(options.init.signal).toBeInstanceOf(AbortSignal);
    expect(result.current.status).toBe('committed');
    expect(result.current.text).toBe('Done');
  });

  it('requests server cancellation before aborting the stream', async () => {
    let resolveStream: (response: Response) => void = () => undefined;
    mockClient.api.chats[':id'].stream.$post.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveStream = resolve;
        }),
    );
    mockClient.api.chats[':id'].generations[':generationId'].cancel.$post.mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    const streamPromise = result.current.stream({ message: 'Stop this' });
    await waitFor(() => expect(result.current.status).toBe('preparing'));
    await result.current.cancel();
    resolveStream(new Response(null));
    await streamPromise;
    await waitFor(() => expect(result.current.status).toBe('cancelled'));

    expect(
      mockClient.api.chats[':id'].generations[':generationId'].cancel.$post,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ param: expect.objectContaining({ id: 'chat-1' }) }),
    );
    expect(result.current.status).toBe('cancelled');
  });
});
