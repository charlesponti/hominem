// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockClient = vi.hoisted(() => ({
  api: {
    chats: {
      ':id': {
        stream: { $post: vi.fn() },
        generations: {
          ':generationId': {
            cancel: { $post: vi.fn() },
            $get: vi.fn(),
            stream: { $get: vi.fn() },
            retry: { $post: vi.fn() },
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

import { useStreamMessage } from './use-stream-message';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

function streamResponse(events: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      events.forEach((event) => controller.enqueue(encoder.encode(`data: ${event}\n\n`)));
      controller.close();
    },
  });
  return new Response(body);
}

function interruptedStreamResponse(events: string[]) {
  const encoder = new TextEncoder();
  let sent = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent) {
        controller.error(new Error('connection interrupted'));
        return;
      }
      sent = true;
      events.forEach((event) => controller.enqueue(encoder.encode(`data: ${event}\n\n`)));
    },
  });
  return new Response(body);
}

describe('useStreamMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.stubGlobal('crypto', { randomUUID: () => 'g1' });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('passes the abort signal and records a committed response', async () => {
    const onAccepted = vi.fn();
    const onCommitted = vi.fn();
    mockClient.api.chats[':id'].stream.$post.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 1,
          type: 'generation.accepted',
          payload: {
            type: 'generation.accepted',
            chatId: 'chat-1',
            chat: {
              id: 'chat-1',
              userId: 'u1',
              title: 'Chat',
              archivedAt: null,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
            userMessage: null,
          },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 2,
          type: 'generation.phase_changed',
          payload: { type: 'generation.phase_changed', phase: 'preparing' },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: null,
          type: 'text-delta',
          payload: { type: 'text-delta', text: 'Hi ' },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: null,
          type: 'reasoning-delta',
          payload: { type: 'reasoning-delta', text: 'Thinking' },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 3,
          type: 'tool.requested',
          payload: {
            type: 'tool.requested',
            call: { id: 'call-1', name: 'search', arguments: '{}', iteration: 0, turnId: 'turn-1' },
          },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 4,
          type: 'tool.completed',
          payload: {
            type: 'tool.completed',
            result: { callId: 'call-1', toolName: 'search', content: 'ok', error: false },
          },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 5,
          type: 'tool.requested',
          payload: {
            type: 'tool.requested',
            call: {
              id: 'call-2',
              name: 'write_memory',
              arguments: '{}',
              iteration: 0,
              turnId: 'turn-1',
            },
          },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 6,
          type: 'tool.failed',
          payload: {
            type: 'tool.failed',
            result: { callId: 'call-1', toolName: 'search', content: 'failed', error: true },
          },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 7,
          type: 'generation.phase_changed',
          payload: { type: 'generation.phase_changed', phase: 'saving' },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 8,
          type: 'generation.cancel_requested',
          payload: {
            type: 'generation.cancel_requested',
            requestedAt: '2026-01-01T00:00:00.000Z',
            requestedBy: 'u1',
          },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 9,
          type: 'generation.retry_scheduled',
          payload: {
            type: 'generation.retry_scheduled',
            attempt: 1,
            maxAttempts: 2,
          },
        }),
        JSON.stringify({
          version: 1,
          type: 'generation.committed',
          generationId: 'g1',
          sequence: 10,
          payload: {
            type: 'generation.committed',
            message: {
              id: 'm1',
              chatId: 'chat-1',
              userId: 'u1',
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
        }),
      ]),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.stream({
      message: 'Hello',
      fileIds: ['file-1'],
      responseLength: 'long',
      onAccepted,
      onCommitted,
    });
    await waitFor(() => expect(result.current.status).toBe('committed'));

    const request = mockClient.api.chats[':id'].stream.$post.mock.calls[0];
    expect(request?.[1]).toEqual(
      expect.objectContaining({
        init: expect.objectContaining({ signal: expect.any(AbortSignal) }),
      }),
    );
    await waitFor(() => expect(result.current.status).toBe('committed'));
    expect(onAccepted).toHaveBeenCalledOnce();
    expect(onCommitted).toHaveBeenCalledOnce();
    expect(result.current.text).toBe('Done');
    expect(result.current.reasoning).toBe('Thinking');
    expect(result.current.toolSteps).toEqual([
      { toolCallId: 'call-1', toolName: 'search', status: 'failed' },
      { toolCallId: 'call-2', toolName: 'write_memory', status: 'requested' },
    ]);
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
    await waitFor(() => expect(result.current.status).toBe('cancelled'));
  });

  it('preserves the awaiting-confirmation phase for the live composer', async () => {
    mockClient.api.chats[':id'].stream.$post.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 1,
          type: 'tool.requested',
          payload: {
            type: 'tool.requested',
            call: {
              id: 'call-1',
              name: 'create_collection',
              arguments: '{}',
              iteration: 0,
              turnId: 'turn-1',
            },
          },
        }),
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 2,
          type: 'confirmation.required',
          payload: {
            type: 'confirmation.required',
            call: {
              id: 'call-1',
              name: 'create_collection',
              arguments: '{}',
              iteration: 0,
              turnId: 'turn-1',
            },
          },
        }),
      ]),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.stream({ message: 'Create a collection' });

    await waitFor(() => expect(result.current.status).toBe('awaiting_confirmation'));
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.toolSteps).toEqual([
      { toolCallId: 'call-1', toolName: 'create_collection', status: 'requested' },
    ]);
  });

  it('surfaces a durable generation failure as a terminal stream error', async () => {
    mockClient.api.chats[':id'].stream.$post.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 1,
          type: 'generation.failed',
          payload: { type: 'generation.failed', message: 'Provider unavailable' },
        }),
      ]),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.stream({ message: 'Hello' });

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.error?.message).toBe(
      'I couldn’t finish that response. Please try again.',
    );
  });

  it('resumes once from the last durable sequence after a stream interruption', async () => {
    mockClient.api.chats[':id'].stream.$post.mockResolvedValueOnce(
      interruptedStreamResponse([
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 1,
          type: 'generation.phase_changed',
          payload: { type: 'generation.phase_changed', phase: 'preparing' },
        }),
      ]),
    );
    mockClient.api.chats[':id'].generations[':generationId'].stream.$get.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 2,
          type: 'generation.committed',
          payload: {
            type: 'generation.committed',
            message: {
              id: 'm1',
              chatId: 'chat-1',
              userId: 'u1',
              role: 'assistant',
              content: 'Recovered',
              files: null,
              toolCalls: null,
              reasoning: null,
              parentMessageId: null,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          },
        }),
      ]),
    );
    mockClient.api.chats[':id'].generations[':generationId'].$get.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'committed' })),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.stream({ message: 'Recover me' });

    await waitFor(() => expect(result.current.status).toBe('committed'));
    expect(
      mockClient.api.chats[':id'].generations[':generationId'].stream.$get,
    ).toHaveBeenCalledWith(
      { param: { id: 'chat-1', generationId: expect.any(String) } },
      { init: expect.objectContaining({ headers: { 'Last-Event-ID': '1' } }) },
    );
    expect(result.current.text).toBe('Recovered');
  });

  it('restores a failed generation with a friendly retry action after reload', async () => {
    window.localStorage.setItem(
      'chat-generation:chat-1',
      JSON.stringify({ generationId: 'failed-1', phase: 'failed', lastDurableSequence: 4 }),
    );
    vi.stubGlobal('crypto', { randomUUID: () => 'retry-1' });
    mockClient.api.chats[':id'].generations[':generationId'].retry.$post.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({
          version: 1,
          generationId: 'retry-1',
          sequence: 1,
          type: 'generation.committed',
          payload: {
            type: 'generation.committed',
            message: {
              id: 'assistant-1',
              chatId: 'chat-1',
              userId: 'u1',
              role: 'assistant',
              content: 'Recovered',
              files: null,
              toolCalls: null,
              reasoning: null,
              parentMessageId: null,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          },
        }),
      ]),
    );

    const onCommitted = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.error?.message).toBe(
      'I couldn’t finish that response. Please try again.',
    );

    await result.current.retry({ responseLength: 'short', onCommitted, onSettled });

    expect(
      mockClient.api.chats[':id'].generations[':generationId'].retry.$post,
    ).toHaveBeenCalledWith(
      {
        param: { id: 'chat-1', generationId: 'failed-1' },
        json: { generationId: 'retry-1', responseLength: 'short' },
      },
      expect.objectContaining({ init: expect.any(Object) }),
    );
    expect(onCommitted).toHaveBeenCalledOnce();
    expect(onSettled).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.status).toBe('committed'));
  });

  it('restores a cancelled terminal state during replay', async () => {
    mockClient.api.chats[':id'].stream.$post.mockResolvedValueOnce(interruptedStreamResponse([]));
    mockClient.api.chats[':id'].generations[':generationId'].stream.$get.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 1,
          type: 'generation.cancelled',
          payload: { type: 'generation.cancelled' },
        }),
      ]),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.stream({ message: 'Recover cancellation' });

    await waitFor(() => expect(result.current.status).toBe('cancelled'));
  });

  it('reattaches an active persisted checkpoint from its durable cursor', async () => {
    window.localStorage.setItem(
      'chat-generation:chat-1',
      JSON.stringify({ generationId: 'g1', phase: 'running', lastDurableSequence: 5 }),
    );
    mockClient.api.chats[':id'].generations[':generationId'].stream.$get.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 6,
          type: 'generation.committed',
          payload: {
            type: 'generation.committed',
            message: {
              id: 'm1',
              chatId: 'chat-1',
              userId: 'u1',
              role: 'assistant',
              content: 'Recovered after launch',
              files: null,
              toolCalls: null,
              reasoning: null,
              parentMessageId: null,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          },
        }),
      ]),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('committed'));
    expect(mockClient.api.chats[':id'].stream.$post).not.toHaveBeenCalled();
    expect(
      mockClient.api.chats[':id'].generations[':generationId'].stream.$get,
    ).toHaveBeenCalledWith(
      { param: { id: 'chat-1', generationId: 'g1' } },
      { init: expect.objectContaining({ headers: { 'Last-Event-ID': '5' } }) },
    );
    expect(window.localStorage.getItem('chat-generation:chat-1')).toBeNull();
  });

  it('reconciles a replay that closes after the durable run already committed', async () => {
    window.localStorage.setItem(
      'chat-generation:chat-1',
      JSON.stringify({ generationId: 'g1', phase: 'running', lastDurableSequence: 5 }),
    );
    mockClient.api.chats[':id'].generations[':generationId'].stream.$get.mockResolvedValueOnce(
      streamResponse([]),
    );
    mockClient.api.chats[':id'].generations[':generationId'].$get.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'committed' })),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('committed'));
    expect(window.localStorage.getItem('chat-generation:chat-1')).toBeNull();
  });

  it('records a durable cancellation and invokes the cancellation callback', async () => {
    const onCancelled = vi.fn();
    mockClient.api.chats[':id'].stream.$post.mockResolvedValueOnce(
      streamResponse([
        JSON.stringify({
          version: 1,
          generationId: 'g1',
          sequence: 1,
          type: 'generation.cancelled',
          payload: { type: 'generation.cancelled' },
        }),
      ]),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.stream({ message: 'Cancel me', onCancelled });

    await waitFor(() => expect(result.current.status).toBe('cancelled'));
    expect(onCancelled).toHaveBeenCalledOnce();
  });

  it('exposes a failed cancellation request', async () => {
    let resolveStream: (response: Response) => void = () => undefined;
    mockClient.api.chats[':id'].stream.$post.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveStream = resolve;
        }),
    );
    mockClient.api.chats[':id'].generations[':generationId'].cancel.$post.mockRejectedValueOnce(
      'Unable to cancel',
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    const streamPromise = result.current.stream({ message: 'Cancel me' });
    await waitFor(() => expect(result.current.status).toBe('preparing'));
    await result.current.cancel();
    await waitFor(() => expect(result.current.status).toBe('failed'));
    resolveStream(new Response(null));
    await streamPromise;

    expect(result.current.error?.message).toBe('Unable to cancel');

    mockClient.api.chats[':id'].stream.$post.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveStream = resolve;
        }),
    );
    mockClient.api.chats[':id'].generations[':generationId'].cancel.$post.mockRejectedValueOnce(
      new Error('Unable to cancel again'),
    );
    const secondStream = result.current.stream({ message: 'Cancel me again' });
    await waitFor(() => expect(result.current.status).toBe('preparing'));
    await result.current.cancel();
    await waitFor(() => expect(result.current.status).toBe('failed'));
    resolveStream(new Response(null));
    await secondStream;
    expect(result.current.error?.message).toBe('Unable to cancel again');
  });

  it('ignores a second cancellation while the first request is stopping', async () => {
    let resolveStream: (response: Response) => void = () => undefined;
    let resolveCancel: (response: Response) => void = () => undefined;
    mockClient.api.chats[':id'].stream.$post.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveStream = resolve;
        }),
    );
    mockClient.api.chats[':id'].generations[':generationId'].cancel.$post.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveCancel = resolve;
        }),
    );

    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    const streamPromise = result.current.stream({ message: 'Cancel me' });
    await waitFor(() => expect(result.current.status).toBe('preparing'));
    const firstCancel = result.current.cancel();
    await waitFor(() => expect(result.current.status).toBe('stopping'));
    await result.current.cancel();
    expect(
      mockClient.api.chats[':id'].generations[':generationId'].cancel.$post,
    ).toHaveBeenCalledOnce();

    resolveCancel(new Response(null, { status: 204 }));
    await firstCancel;
    resolveStream(new Response(null));
    await streamPromise;
    await waitFor(() => expect(result.current.status).toBe('cancelled'));
  });

  it('normalizes an abort and a non-Error stream failure', async () => {
    const onCancelled = vi.fn();
    mockClient.api.chats[':id'].stream.$post.mockRejectedValueOnce(
      new DOMException('aborted', 'AbortError'),
    );
    const { result } = renderHook(() => useStreamMessage({ chatId: 'chat-1' }), { wrapper });
    await result.current.stream({ message: 'Abort me', onCancelled });
    await waitFor(() => expect(result.current.status).toBe('cancelled'));
    expect(onCancelled).toHaveBeenCalledOnce();

    mockClient.api.chats[':id'].stream.$post.mockRejectedValueOnce('stream failed');
    mockClient.api.chats[':id'].generations[':generationId'].stream.$get.mockRejectedValueOnce(
      'stream failed',
    );
    await result.current.stream({ message: 'Fail me' });
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.error?.message).toBe(
      'I couldn’t finish that response. Please try again.',
    );
  });
});
