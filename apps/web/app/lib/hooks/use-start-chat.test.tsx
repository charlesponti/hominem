// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockClient = vi.hoisted(() => ({
  api: { chats: { 'start-stream': { $post: vi.fn() } } },
}));

vi.mock('@hominem/rpc/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hominem/rpc/react')>()),
  useApiClient: () => mockClient,
}));

import { useStartChat } from './use-start-chat';

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

describe('useStartChat', () => {
  it('calls accepted before committed and supplies the durable chat ID', async () => {
    const onAccepted = vi.fn();
    const onCommitted = vi.fn();
    mockClient.api.chats['start-stream'].$post.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({
          type: 'accepted',
          generationId: 'g1',
          chatId: 'chat-1',
          chat: { id: 'chat-1', title: 'Hello', archivedAt: null },
          userMessage: { id: 'user-1', chatId: 'chat-1', role: 'user', content: 'Hello' },
        }),
        JSON.stringify({
          type: 'committed',
          generationId: 'g1',
          message: { id: 'assistant-1', chatId: 'chat-1', role: 'assistant', content: 'Hi' },
        }),
      ]),
    );

    const { result } = renderHook(() => useStartChat(), { wrapper });
    await result.current.start({ title: 'Hello', message: 'Hello', onAccepted, onCommitted });

    await waitFor(() => expect(onCommitted).toHaveBeenCalledOnce());
    expect(onAccepted).toHaveBeenCalledOnce();
    expect(onAccepted.mock.invocationCallOrder[0]).toBeLessThan(
      onCommitted.mock.invocationCallOrder[0]!,
    );
    expect(result.current.isStarting).toBe(false);
  });

  it('passes the first message and generation ID through the typed start route', async () => {
    mockClient.api.chats['start-stream'].$post.mockResolvedValueOnce(streamResponse([]));

    const { result } = renderHook(() => useStartChat(), { wrapper });
    await result.current.start({
      fileIds: ['file-1'],
      message: 'Start here',
      title: 'Start here',
    });

    expect(mockClient.api.chats['start-stream'].$post).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          fileIds: ['file-1'],
          message: 'Start here',
          title: 'Start here',
          generationId: expect.any(String),
        }),
      }),
      expect.objectContaining({
        init: expect.objectContaining({ signal: expect.any(AbortSignal) }),
      }),
    );
  });
});
