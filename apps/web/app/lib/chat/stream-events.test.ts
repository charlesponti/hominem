import type { ChatStreamEvent } from '@hominem/rpc/types';
import { describe, expect, it, vi } from 'vitest';

import { consumeChatStream } from './stream-events';

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

describe('consumeChatStream', () => {
  it('parses events split across chunks and ignores malformed lines', async () => {
    const onEvent = vi.fn<(event: ChatStreamEvent) => void>();

    await consumeChatStream(
      responseFor([
        'data: {"type":"status","generationId":"g1","status":"preparing"}\n',
        'data: {"type":"committed","generationId":"g1","message":{"content":"hi"}}\n',
        'data: {bad}\n',
        'data: [DONE]\n',
      ]),
      onEvent,
    );

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent.mock.calls[0]?.[0]).toMatchObject({ type: 'status' });
    expect(onEvent.mock.calls[1]?.[0]).toMatchObject({ type: 'committed' });
  });

  it('rejects when a response has no body', async () => {
    await expect(consumeChatStream(new Response(null), vi.fn())).rejects.toThrow(
      'No response body',
    );
  });
});
