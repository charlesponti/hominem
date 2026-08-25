// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockClient = vi.hoisted(() => ({
  api: {
    chats: {
      ':id': {
        messages: { ':messageId': { regenerate: { $post: vi.fn() } } },
        generations: { ':generationId': { cancel: { $post: vi.fn() } } },
      },
    },
  },
}));

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => mockClient,
}));

import { useRegenerateMessage } from './use-regenerate-message';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useRegenerateMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('streams regeneration and prevents a concurrent request', async () => {
    const encoder = new TextEncoder();
    let closeStream: () => void = () => undefined;
    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('data: {"type":"status","generationId":"g","status":"preparing"}\n'),
            );
            closeStream = () => controller.close();
          },
        }),
      ),
    );

    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    const first = result.current.regenerate('message-1');
    await waitFor(() => expect(result.current.isRegenerating).toBe(true));
    await result.current.regenerate('message-2');

    expect(
      mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post,
    ).toHaveBeenCalledOnce();
    closeStream();
    await first;
  });

  it('passes an abort signal and cancels the active generation before aborting', async () => {
    let resolveStream: (response: Response) => void = () => undefined;
    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveStream = resolve;
        }),
    );
    mockClient.api.chats[':id'].generations[':generationId'].cancel.$post.mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    );

    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    const regeneration = result.current.regenerate('message-1');
    await waitFor(() => expect(result.current.isRegenerating).toBe(true));
    await result.current.cancel();
    resolveStream(new Response(null));
    await regeneration;

    expect(
      mockClient.api.chats[':id'].generations[':generationId'].cancel.$post,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ param: expect.objectContaining({ id: 'chat-1' }) }),
    );
    await waitFor(() => expect(result.current.isRegenerating).toBe(false));
  });

  it('retains the target message for retry after a failed regeneration', async () => {
    const encoder = new TextEncoder();
    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: {"type":"error","message":"failed"}\n'));
              controller.close();
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
        ),
      );

    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.regenerate('message-1', 'long');
    await waitFor(() => expect(result.current.error?.message).toBe('failed'));
    expect(result.current.lastMessageId).toBe('message-1');

    await result.current.retry();
    expect(
      mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post,
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({ responseLength: 'long' }),
      }),
      expect.objectContaining({
        init: expect.objectContaining({ signal: expect.any(AbortSignal) }),
      }),
    );
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
