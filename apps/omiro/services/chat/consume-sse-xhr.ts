import { createSseDecoder, finishSse, pushSseChunk, type SseOutput } from '@hominem/chat/sse';
import { logger } from '@hominem/telemetry';

export interface ConsumeSseXhrOptions<TEvent> {
  url: string;
  payload: unknown;
  getHeaders: () => Promise<Record<string, string>>;
  onEvent: (event: TEvent) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

function getAbortError() {
  return new DOMException('Aborted', 'AbortError');
}

// XHR-based SSE client for React Native / Hermes.
// Hermes does not expose ReadableStream on fetch responses, but XHR.responseText
// grows incrementally as data arrives — we slice from the last offset on each
// readystatechange to extract new SSE lines without re-parsing the full body.
export async function consumeSseXhr<TEvent>({
  url,
  payload,
  getHeaders,
  onEvent,
  onDone,
  signal,
}: ConsumeSseXhrOptions<TEvent>): Promise<void> {
  if (signal?.aborted) throw getAbortError();

  const authHeaders = await getHeaders();
  if (signal?.aborted) throw getAbortError();

  return new Promise<void>((resolve, reject) => {
    let decoder = createSseDecoder();
    let offset = 0;
    let settled = false;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
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

        const event = output.event as TEvent & {
          type?: string;
          message?: string;
          error?: string;
        };
        if (
          (event.type === 'error' || event.error) &&
          typeof (event.message ?? event.error) === 'string'
        ) {
          rejectOnce(new Error(event.message ?? event.error));
          return;
        }
        onEvent(output.event);
      }
    };

    const onAbort = () => {
      xhr.abort();
      rejectOnce(getAbortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    xhr.onreadystatechange = () => {
      if (settled) return;
      // readyState 3 = LOADING (data arriving), 4 = DONE
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

    xhr.send(JSON.stringify(payload));
  });
}
