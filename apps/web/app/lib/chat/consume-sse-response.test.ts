import type { GenerationStreamEvent } from '@hominem/rpc/types';
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
    const onEvent = vi.fn<(event: GenerationStreamEvent) => void>();

    await consumeSseResponse(
      responseFor([
        'data: {"version":1,"generationId":"g1","sequence":1,"type":"generation.phase_changed","payload":{"type":"generation.phase_changed","phase":"preparing"}}\n\n',
        'data: {"version":1,"generationId":"g1","sequence":2,"type":"generation.committed","payload":{"type":"generation.committed","message":{"id":"m1","chatId":"c1","userId":"u1","role":"assistant","content":"hi","files":null,"toolCalls":null,"reasoning":null,"parentMessageId":null,"createdAt":"2026-01-01","updatedAt":"2026-01-01"}}}\n\n',
        'data: {bad}\n\n',
        ': keep-alive\n\n',
        'data: [DONE]\n\n',
      ]),
      onEvent,
    );

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent.mock.calls[0]?.[0]).toMatchObject({ type: 'generation.phase_changed' });
    expect(onEvent.mock.calls[1]?.[0]).toMatchObject({ type: 'generation.committed' });
  });

  it('flushes a final event without a trailing newline', async () => {
    const onEvent = vi.fn<(event: GenerationStreamEvent) => void>();

    await consumeSseResponse(
      responseFor([
        'data: {"version":1,"generationId":"g1","sequence":1,"type":"generation.phase_changed","payload":{"type":"generation.phase_changed","phase":"preparing"}}',
      ]),
      onEvent,
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'generation.phase_changed' }),
    );
  });

  it('rejects when a response has no body', async () => {
    await expect(consumeSseResponse(new Response(null), vi.fn())).rejects.toThrow(
      'No response body',
    );
  });
});
