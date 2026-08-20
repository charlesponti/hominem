import { logger } from '@hominem/telemetry';

export interface StreamSSEOptions<TEvent> {
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

function getSSEFrameDelimiter(value: string): { index: number; length: number } | null {
  const match = /\r?\n\r?\n/.exec(value);
  return match ? { index: match.index, length: match[0].length } : null;
}

function getFrameData(frame: string): string | null {
  const dataLines = frame
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .flatMap((line) => {
      if (line.startsWith('data: ')) return [line.slice(6)];
      if (line.startsWith('data:')) return [line.slice(5)];
      return [];
    });

  return dataLines.length > 0 ? dataLines.join('\n') : null;
}

// XHR-based SSE client for React Native / Hermes.
// Hermes does not expose ReadableStream on fetch responses, but XHR.responseText
// grows incrementally as data arrives — we slice from the last offset on each
// readystatechange to extract new SSE lines without re-parsing the full body.
export async function streamSSE<TEvent>({
  url,
  payload,
  getHeaders,
  onEvent,
  onDone,
  signal,
}: StreamSSEOptions<TEvent>): Promise<void> {
  if (signal?.aborted) throw getAbortError();

  const authHeaders = await getHeaders();
  if (signal?.aborted) throw getAbortError();

  return new Promise<void>((resolve, reject) => {
    let buffer = '';
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
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const processFrame = (frame: string) => {
      const data = getFrameData(frame);
      if (data === null) return;
      if (data === '[DONE]') {
        onDone?.();
        return;
      }

      try {
        const parsed = JSON.parse(data) as { type?: string; message?: string; error?: string };
        if (
          (parsed.type === 'error' || parsed.error) &&
          typeof (parsed.message ?? parsed.error) === 'string'
        ) {
          rejectOnce(new Error(parsed.message ?? parsed.error ?? 'Stream error'));
          return;
        }
        onEvent(parsed as TEvent);
      } catch (error) {
        logger.warn('[streamSSE] Dropped malformed SSE frame', { data, error });
      }
    };
    const processBufferedFrames = () => {
      let delimiter = getSSEFrameDelimiter(buffer);
      while (delimiter) {
        const frame = buffer.slice(0, delimiter.index);
        buffer = buffer.slice(delimiter.index + delimiter.length);
        processFrame(frame);
        if (settled) return;
        delimiter = getSSEFrameDelimiter(buffer);
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
      buffer += newText;
      processBufferedFrames();
      if (settled) return;

      if (xhr.readyState === 4) {
        if (buffer.trim().length > 0) {
          processFrame(buffer);
          buffer = '';
          if (settled) return;
        }

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
