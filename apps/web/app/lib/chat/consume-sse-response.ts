import {
  createGenerationEventDeduplicator,
  GENERATION_TIMING,
  parseGenerationWireEvent,
} from '@hominem/chat';
import type { GenerationWireEvent } from '@hominem/chat';
import { createSseDecoder, finishSse, pushSseChunk } from '@hominem/chat/sse';

export class SseIdleTimeoutError extends Error {
  constructor(idleMs: number) {
    super(`No SSE data received for ${idleMs}ms`);
    this.name = 'SseIdleTimeoutError';
  }
}

// services/api writes a `:heartbeat` comment frame roughly every
// GENERATION_TIMING.heartbeatMs while a generation is in progress (see
// chats.generation.ts) specifically so this timer has something to reset
// against even when no real event has arrived yet. clientIdleMs is defined
// relative to that in GENERATION_TIMING, not chosen independently.
const DEFAULT_SSE_IDLE_TIMEOUT_MS = GENERATION_TIMING.clientIdleMs;

function readWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idleMs: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SseIdleTimeoutError(idleMs)), idleMs);
    reader.read().then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function consumeSseResponse(
  response: Response,
  onEvent: (event: GenerationWireEvent) => void,
  onDone?: () => void,
  options?: {
    deduplicateEvent?: (event: GenerationWireEvent) => GenerationWireEvent | null;
    onDurableSequence?: (sequence: number) => void;
    idleTimeoutMs?: number;
  },
): Promise<void> {
  const body = response.body;
  if (!body) {
    throw new Error('No response body');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const deduplicate = options?.deduplicateEvent ?? createGenerationEventDeduplicator();
  const idleTimeoutMs = options?.idleTimeoutMs ?? DEFAULT_SSE_IDLE_TIMEOUT_MS;
  let state = createSseDecoder();
  const parseEvent = (data: string) => parseGenerationWireEvent(JSON.parse(data));

  const processOutputs = (
    outputs: ReturnType<typeof pushSseChunk<GenerationWireEvent>>['outputs'],
  ) => {
    outputs.forEach((output) => {
      if (output.kind === 'event') {
        const event = deduplicate(output.event);
        if (event) {
          if (event.sequence !== null) options?.onDurableSequence?.(event.sequence);
          onEvent(event);
        }
      }
      if (output.kind === 'done') onDone?.();
    });
  };

  while (true) {
    let step: ReadableStreamReadResult<Uint8Array>;
    try {
      step = await readWithIdleTimeout(reader, idleTimeoutMs);
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    }
    const { done, value } = step;
    if (done) break;

    const decoded = decoder.decode(value, { stream: true });
    const result = pushSseChunk<GenerationWireEvent>(state, decoded, parseEvent);
    state = result.state;
    processOutputs(result.outputs);
  }

  const trailingText = decoder.decode();
  const trailing = pushSseChunk<GenerationWireEvent>(state, trailingText, parseEvent);
  const result = finishSse<GenerationWireEvent>(trailing.state, parseEvent);
  processOutputs(trailing.outputs);
  processOutputs(result.outputs);
}
