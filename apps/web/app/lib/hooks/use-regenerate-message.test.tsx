// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { act } from 'react';
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
              encoder.encode(
                'data: {"version":1,"generationId":"g","sequence":1,"type":"generation.phase_changed","payload":{"type":"generation.phase_changed","phase":"preparing"}}\n\n',
              ),
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
              controller.enqueue(
                encoder.encode(
                  'data: {"version":1,"generationId":"g","sequence":1,"type":"generation.failed","payload":{"type":"generation.failed","message":"failed"}}\n\n',
                ),
              );
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

  it('handles a durable generation failure during replay', async () => {
    const encoder = new TextEncoder();
    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'data: {"version":1,"generationId":"g","sequence":1,"type":"generation.failed","payload":{"type":"generation.failed","message":"replay failed"}}\n\n',
              ),
            );
            controller.close();
          },
        }),
      ),
    );

    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.regenerate('message-1');

    await waitFor(() => expect(result.current.error?.message).toBe('replay failed'));
    expect(result.current.status).toBe('failed');
  });

  it('reduces saving, committed, and cancelled lifecycle events', async () => {
    const encoder = new TextEncoder();
    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            for (const event of [
              {
                version: 1,
                generationId: 'g',
                sequence: 1,
                type: 'generation.phase_changed',
                payload: { type: 'generation.phase_changed', phase: 'saving' },
              },
              {
                version: 1,
                generationId: 'g',
                sequence: 2,
                type: 'generation.committed',
                payload: {
                  type: 'generation.committed',
                  message: {
                    id: 'assistant-1',
                    chatId: 'chat-1',
                    userId: 'user-1',
                    role: 'assistant',
                    content: 'Done',
                    files: null,
                    toolCalls: null,
                    reasoning: null,
                    parentMessageId: null,
                    createdAt: '2026-01-01',
                    updatedAt: '2026-01-01',
                  },
                },
              },
              {
                version: 1,
                generationId: 'g',
                sequence: 3,
                type: 'generation.cancelled',
                payload: { type: 'generation.cancelled' },
              },
            ]) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
            controller.close();
          },
        }),
      ),
    );

    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.regenerate('message-1');

    await waitFor(() => expect(result.current.status).toBe('cancelled'));
    expect(result.current.activeMessageId).toBeNull();
  });

  it('ignores cancellation while idle and retry without a prior request', async () => {
    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.cancel();
    await result.current.retry();

    expect(
      mockClient.api.chats[':id'].generations[':generationId'].cancel.$post,
    ).not.toHaveBeenCalled();
    expect(
      mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post,
    ).not.toHaveBeenCalled();
  });

  it('surfaces a failed cancellation request', async () => {
    let resolveStream: (response: Response) => void = () => undefined;
    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveStream = resolve;
        }),
    );
    mockClient.api.chats[':id'].generations[':generationId'].cancel.$post.mockRejectedValueOnce(
      new Error('Unable to cancel'),
    );

    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    const regeneration = result.current.regenerate('message-1');
    await waitFor(() => expect(result.current.isRegenerating).toBe(true));
    await result.current.cancel();
    await waitFor(() => expect(result.current.status).toBe('failed'));
    resolveStream(new Response(null));
    await regeneration;

    expect(result.current.error?.message).toBe('Unable to cancel');
  });

  it('normalizes a non-Error cancellation failure', async () => {
    let resolveStream: (response: Response) => void = () => undefined;
    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveStream = resolve;
        }),
    );
    mockClient.api.chats[':id'].generations[':generationId'].cancel.$post.mockRejectedValueOnce(
      'Unable to cancel',
    );

    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    const regeneration = result.current.regenerate('message-1');
    await waitFor(() => expect(result.current.isRegenerating).toBe(true));
    await result.current.cancel();
    await waitFor(() => expect(result.current.status).toBe('failed'));
    resolveStream(new Response(null));
    await regeneration;

    expect(result.current.error?.message).toBe('Unable to cancel');
  });

  it('ignores transport aborts and normalizes non-Error stream failures', async () => {
    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post.mockRejectedValueOnce(
      new DOMException('aborted', 'AbortError'),
    );
    const { result } = renderHook(() => useRegenerateMessage({ chatId: 'chat-1' }), { wrapper });
    await act(async () => {
      result.current.regenerate('message-1');
    });
    await waitFor(() => expect(result.current.activeMessageId).toBeNull());

    mockClient.api.chats[':id'].messages[':messageId'].regenerate.$post.mockRejectedValueOnce(
      'transport failed',
    );
    await act(async () => {
      await result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.error?.message).toBe('transport failed');
  });
});
