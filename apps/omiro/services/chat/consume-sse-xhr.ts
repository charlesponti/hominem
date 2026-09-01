import { createSseDecoder, finishSse, pushSseChunk, type SseOutput } from '@hominem/chat/sse';
import { createGenerationEventDeduplicator } from '@hominem/rpc/generation-events';
import type { GenerationWireEvent } from '@hominem/rpc/types';
import { logger } from '@hominem/telemetry';

export interface ConsumeSseXhrOptions<TEvent> {
  url: string;
  payload: unknown;
  getHeaders: () => Promise<Record<string, string>>;
  onEvent: (event: TEvent) => void;
  onDone?: () => void;
  signal?: AbortSignal;
  method?: 'GET' | 'POST';
  parseEvent?: (input: unknown) => TEvent;
  deduplicateEvent?: (event: TEvent) => TEvent | null;
  onDurableSequence?: (sequence: number) => void;
}

function getAbortError() {
  return new DOMException('Aborted', 'AbortError');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getDurableSequence(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;
  const sequence = value.sequence;
  return typeof sequence === 'number' && Number.isSafeInteger(sequence) ? sequence : undefined;
}

// XHR-based SSE client for React Native / Hermes.
// Hermes doesn't expose ReadableStream on fetch responses, but XHR.responseText
// grows incrementally as data arrives -- we slice from the last offset on each
// readystatechange to pull out new SSE lines without re-parsing the whole body.
export async function consumeSseXhr<TEvent>({
  url,
  payload,
  getHeaders,
  onEvent,
  onDone,
  signal,
  method = 'POST',
  parseEvent,
  deduplicateEvent,
  onDurableSequence,
}: ConsumeSseXhrOptions<TEvent>): Promise<void> {
  if (signal?.aborted) throw getAbortError();

  const authHeaders = await getHeaders();
  if (signal?.aborted) throw getAbortError();

  return new Promise<void>((resolve, reject) => {
    let decoder = createSseDecoder();
    let offset = 0;
    let settled = false;

    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');

    for (const [key, value] of Object.entries(authHeaders)) {
      xhr.setRequestHeader(key, value);
    }

    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const resolveOnce = () => {
      settled = true;
      cleanup();
      resolve();
    };
    const processOutputs = (outputs: SseOutput<TEvent>[]) => {
      for (const output of outputs) {
        if (output.kind === 'done') {
          onDone?.();
          continue;
        }
        if (output.kind === 'malformed') {
          logger.warn('[consumeSseXhr] Dropped malformed SSE frame', {
            data: output.data,
            error: output.error,
          });
          continue;
        }
        if (output.kind !== 'event') continue;

        const event = isRecord(output.event) ? output.event : null;
        const eventType = typeof event?.type === 'string' ? event.type : undefined;
        const eventMessage = typeof event?.message === 'string' ? event.message : undefined;
        const eventError = typeof event?.error === 'string' ? event.error : undefined;
        if (
          (eventType === 'error' || eventError !== undefined) &&
          (eventMessage ?? eventError) !== undefined
        ) {
          rejectOnce(new Error(eventMessage ?? eventError));
          return;
        }
        try {
          const parsedEvent = parseEvent ? parseEvent(output.event) : output.event;
          const nextEvent = deduplicateEvent ? deduplicateEvent(parsedEvent) : parsedEvent;
          if (nextEvent) {
            const sequence = getDurableSequence(nextEvent);
            if (sequence !== undefined) {
              onDurableSequence?.(sequence);
            }
            onEvent(nextEvent);
          }
        } catch (error) {
          rejectOnce(error instanceof Error ? error : new Error(String(error)));
          return;
        }
      }
    };

    const onAbort = () => {
      xhr.abort();
      rejectOnce(getAbortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    xhr.onreadystatechange = () => {
      if (settled) return;
      // 3 = LOADING (data arriving), 4 = DONE
      if (xhr.readyState < 3) return;

      const newText = xhr.responseText.slice(offset);
      offset = xhr.responseText.length;
      const result = pushSseChunk<TEvent>(decoder, newText);
      decoder = result.state;
      processOutputs(result.outputs);
      if (settled) return;

      if (xhr.readyState === 4) {
        const finalResult = finishSse<TEvent>(decoder);
        processOutputs(finalResult.outputs);
        decoder = finalResult.state;
        if (settled) return;

        if (xhr.status >= 200 && xhr.status < 300) {
          resolveOnce();
        } else {
          rejectOnce(new Error(`SSE stream failed: HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      rejectOnce(new Error('SSE network error'));
    };

    xhr.send(method === 'GET' ? null : JSON.stringify(payload));
  });
}

export interface ConsumeGenerationSseXhrOptions {
  url: string;
  payload: unknown;
  replayUrl: (afterSequence: number) => string;
  replayMethod?: 'GET' | 'POST';
  replayPayload?: unknown;
  getHeaders: () => Promise<Record<string, string>>;
  onEvent: (event: GenerationWireEvent) => void;
  onDone?: () => void;
  signal?: AbortSignal;
  parseEvent?: (input: unknown) => GenerationWireEvent;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

// Consumes a generation stream and, if the transport drops, resumes the
// semantic event log once from where it left off.
export async function consumeGenerationSseXhr({
  url,
  payload,
  replayUrl,
  replayMethod = 'GET',
  replayPayload = null,
  getHeaders,
  onEvent,
  onDone,
  signal,
  parseEvent,
}: ConsumeGenerationSseXhrOptions): Promise<void> {
  const deduplicateEvent = createGenerationEventDeduplicator();
  let lastDurableSequence = 0;
  let callbackFailed = false;
  const consume = (input: { method: 'GET' | 'POST'; url: string; payload: unknown }) =>
    consumeSseXhr({
      ...input,
      getHeaders,
      onDone,
      onEvent: (event: GenerationWireEvent) => {
        try {
          onEvent(event);
        } catch (error) {
          callbackFailed = true;
          throw error;
        }
      },
      signal,
      parseEvent,
      deduplicateEvent,
      onDurableSequence: (sequence) => {
        lastDurableSequence = Math.max(lastDurableSequence, sequence);
      },
    });

  try {
    await consume({ method: 'POST', url, payload });
  } catch (error) {
    if (callbackFailed || signal?.aborted || isAbortError(error)) throw error;
    await consume({
      method: replayMethod,
      url: replayUrl(lastDurableSequence),
      payload: replayPayload,
    });
  }
}
