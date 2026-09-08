import { isObject } from '@hominem/utils';

import type { ChatClientTransport, ChatClientTransportRequest } from './client-transport-fetch';
import type { GenerationEvent } from './generation-machine';
import { createGenerationEventDeduplicator, parseGenerationWireEvent } from './generation-schemas';
import { createSseDecoder, finishSse, pushSseChunk, type SseOutput } from './sse';

export type Xhr = {
  open: (method: string, url: string) => void;
  setRequestHeader: (name: string, value: string) => void;
  send: (body: unknown) => void;
  abort: () => void;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  onreadystatechange: (() => void) | null;
  readyState: number;
  responseText: string;
  status: number;
};

export type XhrFactory = () => Xhr;

const defaultXhrFactory: XhrFactory = () => {
  const XhrConstructor = (globalThis as { XMLHttpRequest?: new () => Xhr }).XMLHttpRequest;
  if (!XhrConstructor) throw new Error('XMLHttpRequest is not available in this environment');
  return new XhrConstructor();
};

export const xhrChatTransport = (
  createXhr: XhrFactory = defaultXhrFactory,
): ChatClientTransport => ({
  request: ({ url, init, signal }: ChatClientTransportRequest) =>
    new Promise<Response>((resolve, reject) => {
      const xhr = createXhr();
      xhr.open(init.method ?? 'GET', url);
      new Headers(init.headers).forEach((value, key) => xhr.setRequestHeader(key, value));
      xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status }));
      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.onabort = () => reject(abortError());
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      void xhr.send(init.body ?? null);
    }),
});

export type ConsumeSseXhrOptions<TEvent> = {
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
  createXhr?: XhrFactory;
};

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

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
  createXhr = defaultXhrFactory,
}: ConsumeSseXhrOptions<TEvent>): Promise<void> {
  if (signal?.aborted) throw abortError();
  const authHeaders = await getHeaders();
  if (signal?.aborted) throw abortError();

  await new Promise<void>((resolve, reject) => {
    const xhr = createXhr();
    let decoder = createSseDecoder();
    let offset = 0;
    let settled = false;
    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    Object.entries(authHeaders).forEach(([key, value]) => xhr.setRequestHeader(key, value));

    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const done = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const process = (outputs: SseOutput<TEvent>[]) => {
      for (const output of outputs) {
        if (output.kind === 'done') {
          onDone?.();
          continue;
        }
        if (output.kind === 'malformed') continue;
        if (output.kind !== 'event') continue;
        try {
          const raw = isRecord(output.event) ? output.event : null;
          const message = typeof raw?.message === 'string' ? raw.message : undefined;
          const fallback = typeof raw?.error === 'string' ? raw.error : undefined;
          if ((raw?.type === 'error' || fallback !== undefined) && (message ?? fallback)) {
            throw new Error(message ?? fallback);
          }
          const parsed = parseEvent ? parseEvent(output.event) : output.event;
          const event = deduplicateEvent ? deduplicateEvent(parsed) : parsed;
          if (!event) continue;
          const sequence = getDurableSequence(event);
          if (sequence !== undefined) onDurableSequence?.(sequence);
          onEvent(event);
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
          return;
        }
      }
    };
    const read = () => {
      const chunk = xhr.responseText.slice(offset);
      offset = xhr.responseText.length;
      const result = pushSseChunk<TEvent>(decoder, chunk);
      decoder = result.state;
      process(result.outputs);
    };
    const onAbort = () => {
      xhr.abort();
      fail(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    xhr.onreadystatechange = () => {
      if (settled || xhr.readyState < 3) return;
      read();
      if (xhr.readyState !== 4 || settled) return;
      process(finishSse<TEvent>(decoder).outputs);
      if (settled) return;
      if (xhr.status >= 200 && xhr.status < 300) done();
      else fail(new Error(`SSE stream failed: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => fail(new Error('SSE network error'));
    xhr.onabort = () => fail(abortError());
    void xhr.send(method === 'GET' ? null : JSON.stringify(payload));
  });
}

export type ConsumeGenerationSseXhrOptions = {
  url: string;
  payload: unknown;
  replayUrl: (afterSequence: number) => string;
  getHeaders: () => Promise<Record<string, string>>;
  onEvent: (event: GenerationEvent) => void;
  getReplayCursor: () => number;
  onDone?: () => void;
  signal?: AbortSignal;
  method?: 'GET' | 'POST';
  replayMethod?: 'GET' | 'POST';
  replayPayload?: unknown;
  parseEvent?: (input: unknown) => GenerationEvent;
  createXhr?: XhrFactory;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

function getDurableSequence(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;
  return typeof value.sequence === 'number' && Number.isSafeInteger(value.sequence)
    ? value.sequence
    : undefined;
}

export async function consumeGenerationSseXhr({
  url,
  payload,
  replayUrl,
  getHeaders,
  onEvent,
  getReplayCursor,
  onDone,
  signal,
  method = 'POST',
  replayMethod = 'GET',
  replayPayload = null,
  parseEvent = parseGenerationWireEvent,
  createXhr,
}: ConsumeGenerationSseXhrOptions): Promise<void> {
  const deduplicate = createGenerationEventDeduplicator();
  let callbackFailed = false;
  const consume = (request: { method: 'GET' | 'POST'; url: string; payload: unknown }) =>
    consumeSseXhr({
      ...request,
      getHeaders,
      onDone,
      signal,
      createXhr,
      parseEvent,
      deduplicateEvent: deduplicate,
      onEvent: (event) => {
        try {
          onEvent(event);
        } catch (error) {
          callbackFailed = true;
          throw error;
        }
      },
    });
  try {
    await consume({ method, url, payload });
  } catch (error) {
    if (
      callbackFailed ||
      signal?.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      throw error;
    }
    await consume({
      method: replayMethod,
      url: replayUrl(getReplayCursor()),
      payload: replayPayload,
    });
  }
}
