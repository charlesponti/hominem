import type { ChatStreamEvent } from '@hominem/rpc/types';
import { describe, expect, it, vi } from 'vitest';

import { consumeSseResponse } from './consume-sse-response';

function responseFor(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });

  return new Response(stream);
}

describe('consumeSseResponse', () => {
  it('parses events split across chunks and ignores malformed lines', async () => {
    const onEvent = vi.fn<(event: ChatStreamEvent) => void>();

    await consumeSseResponse(
      responseFor([
        'data: {"type":"status","generationId":"g1","status":"preparing"}\n',
        'data: {"type":"committed","generationId":"g1","message":{"content":"hi"}}\n',
        'data: {bad}\n',
        ': keep-alive\n',
        'data: [DONE]\n',
      ]),
      onEvent,
    );

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent.mock.calls[0]?.[0]).toMatchObject({ type: 'status' });
    expect(onEvent.mock.calls[1]?.[0]).toMatchObject({ type: 'committed' });
  });

  it('flushes a final event without a trailing newline', async () => {
    const onEvent = vi.fn<(event: ChatStreamEvent) => void>();

    await consumeSseResponse(responseFor(['data: {"type":"status"}']), onEvent);

    expect(onEvent).toHaveBeenCalledWith({ type: 'status' });
  });

  it('rejects when a response has no body', async () => {
    await expect(consumeSseResponse(new Response(null), vi.fn())).rejects.toThrow(
      'No response body',
    );
  });
});
