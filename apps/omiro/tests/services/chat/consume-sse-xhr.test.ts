import {
  createGenerationClientState,
  createGenerationEventDeduplicator,
  parseGenerationHistoryEvent,
  parseGenerationWireEvent,
  reduceGenerationClientEvent,
  toolEventRoundTripFixture,
  type GenerationWireEvent,
} from '@hominem/chat';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { consumeGenerationSseXhr, consumeSseXhr } from '~/services/chat/consume-sse-xhr';

class FakeXMLHttpRequest {
  static current: FakeXMLHttpRequest | null = null;

  onerror: (() => void) | null = null;
  onreadystatechange: (() => void) | null = null;
  readyState = 0;
  responseText = '';
  status = 200;
  headers: Record<string, string> = {};
  method = '';
  url = '';
  body: string | null = null;

  constructor() {
    FakeXMLHttpRequest.current = this;
  }

  abort() {}

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: string | null) {
    this.body = body;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  push(text: string) {
    this.responseText += text;
    this.readyState = 3;
    this.onreadystatechange?.();
  }

  finish(status = 200, text = '') {
    this.status = status;
    this.responseText += text;
    this.readyState = 4;
    this.onreadystatechange?.();
  }

  notifyReadyState(readyState: number) {
    this.readyState = readyState;
    this.onreadystatechange?.();
  }
}

async function startStream<TEvent = unknown>(
  onEvent: (event: TEvent) => void = vi.fn(),
  onDone = vi.fn(),
  signal?: AbortSignal,
  options?: {
    deduplicateEvent?: (event: TEvent) => TEvent | null;
    parseEvent?: (input: unknown) => TEvent;
    onDurableSequence?: (sequence: number) => void;
  },
) {
  const promise = consumeSseXhr({
    url: 'https://example.test/stream',
    payload: { message: 'hello' },
    getHeaders: async () => ({ authorization: 'Bearer token' }),
    onEvent,
    onDone,
    signal,
    deduplicateEvent: options?.deduplicateEvent,
    parseEvent: options?.parseEvent,
    onDurableSequence: options?.onDurableSequence,
  });
  await Promise.resolve();
  const xhr = FakeXMLHttpRequest.current;
  if (!xhr) throw new Error('Expected stream to create an XHR instance');
  return { onDone, onEvent, promise, xhr };
}

describe('consumeSseXhr', () => {
  const originalXMLHttpRequest = globalThis.XMLHttpRequest;

  afterEach(() => {
    FakeXMLHttpRequest.current = null;
    globalThis.XMLHttpRequest = originalXMLHttpRequest;
  });

  it('reduces the shared tool fixture to the same terminal state as Web', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    let state = createGenerationClientState('generation-1');
    const events = toolEventRoundTripFixture().map((payload, index) =>
      parseGenerationHistoryEvent({
        version: 1,
        generationId: 'generation-1',
        sequence: index + 1,
        type: payload.type,
        payload,
      }),
    );
    const { promise, xhr } = await startStream<GenerationWireEvent>(
      (event) => {
        state = reduceGenerationClientEvent(state, event);
      },
      vi.fn(),
      undefined,
      {
        parseEvent: parseGenerationWireEvent,
        deduplicateEvent: createGenerationEventDeduplicator(),
      },
    );

    const frames = [...events, events.at(-1)!]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join('');
    xhr.finish(200, `${frames}data: [DONE]\n\n`);
    await promise;

    expect(state).toMatchObject({
      phase: 'committed',
      lastDurableSequence: 11,
      text: 'Saved',
      toolSteps: [
        { toolCallId: 'call-search', toolName: 'search', status: 'completed' },
        { toolCallId: 'call-write', toolName: 'write_memory', status: 'failed' },
      ],
    });
  });

  it('parses complete SSE chunks', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const { onDone, onEvent, promise, xhr } = await startStream();

    xhr.finish(200, 'data: {"type":"chunk","chunk":"hello"}\n\ndata: [DONE]\n\n');
    await promise;

    expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', chunk: 'hello' });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('preserves split SSE frames until they are complete', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const { onEvent, promise, xhr } = await startStream();

    xhr.push('data: {"type":"chu');
    xhr.push('nk","chunk":"hel');
    xhr.push('lo"}\n\n');
    xhr.finish(200, 'data: [DONE]\n\n');
    await promise;

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', chunk: 'hello' });
  });

  it('drops duplicate durable events while preserving the first occurrence', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const deduplicateEvent = createGenerationEventDeduplicator();
    let lastSequence = 0;
    const { onEvent, promise, xhr } = await startStream(vi.fn(), vi.fn(), undefined, {
      parseEvent: parseGenerationWireEvent,
      deduplicateEvent,
      onDurableSequence: (sequence) => (lastSequence = sequence),
    });

    const frame =
      'data: {"version":1,"generationId":"g1","sequence":1,"type":"generation.phase_changed","payload":{"type":"generation.phase_changed","phase":"preparing"}}\n\n';
    xhr.finish(200, frame + frame);
    await promise;

    expect(onEvent).toHaveBeenCalledOnce();
    expect(lastSequence).toBe(1);
  });

  it('rejects when the server sends an error frame', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const { promise, xhr } = await startStream();

    xhr.finish(200, 'data: {"type":"error","message":"stream failed"}\n\n');

    await expect(promise).rejects.toThrow('stream failed');
  });

  it('rejects when an event handler reports a domain failure', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const { promise, xhr } = await startStream(() => {
      throw new Error('durable generation failed');
    });

    xhr.finish(200, 'data: {"type":"generation.failed"}\n\n');

    await expect(promise).rejects.toThrow('durable generation failed');
  });

  it('ignores non-object event payloads', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const { onEvent, promise, xhr } = await startStream();

    xhr.finish(200, 'data: null\n\ndata: 1\n\ndata: [DONE]\n\n');
    await promise;

    expect(onEvent).toHaveBeenCalledWith(1);
  });

  it('normalizes non-Error event handler failures', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const { promise, xhr } = await startStream(() => {
      throw 'handler failed';
    });

    xhr.finish(200, 'data: {"type":"chunk"}\n\n');

    await expect(promise).rejects.toThrow('handler failed');
  });

  it('uses the error field when an error frame has no message', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const { promise, xhr } = await startStream();

    xhr.finish(200, 'data: {"error":"fallback error"}\n\n');

    await expect(promise).rejects.toThrow('fallback error');
  });

  it('rejects failed HTTP responses', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const { promise, xhr } = await startStream();

    xhr.finish(500);

    await expect(promise).rejects.toThrow('SSE stream failed: HTTP 500');
  });

  it('rejects before creating a request when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      consumeSseXhr({
        url: 'https://example.test/stream',
        payload: {},
        getHeaders: async () => ({}),
        onEvent: vi.fn(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects if authentication resolves after cancellation', async () => {
    const controller = new AbortController();
    const getHeaders = async () => {
      controller.abort();
      return {};
    };

    await expect(
      consumeSseXhr({
        url: 'https://example.test/stream',
        payload: {},
        getHeaders,
        onEvent: vi.fn(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('handles network errors, malformed frames, comments, and partial final frames', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const onEvent = vi.fn();
    const { promise, xhr } = await startStream(onEvent);

    xhr.notifyReadyState(2);
    xhr.push(': keep-alive\n\ndata: {bad}\n\n');
    xhr.finish(200, 'data: {"type":"chunk","chunk":"last"}');
    await promise;

    expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', chunk: 'last' });

    const failed = startStream();
    const failedXhr = await failed;
    failedXhr.xhr.onerror?.();
    failedXhr.xhr.onerror?.();
    await expect(failedXhr.promise).rejects.toThrow('SSE network error');
  });

  it('rejects a partial final error frame', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const { promise, xhr } = await startStream();

    xhr.finish(200, 'data: {"type":"error","message":"partial failure"}');

    await expect(promise).rejects.toThrow('partial failure');
  });

  it('aborts the XHR and rejects when the signal is cancelled', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const controller = new AbortController();
    const { promise, xhr } = await startStream(vi.fn(), vi.fn(), controller.signal);

    controller.abort();
    xhr.notifyReadyState(3);
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('resumes once from the last durable sequence after a transport failure', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const onEvent = vi.fn();
    const promise = consumeGenerationSseXhr({
      url: 'https://example.test/generations/g1/stream',
      payload: { generationId: 'g1' },
      replayUrl: (afterSequence) =>
        `https://example.test/generations/g1/stream?afterSequence=${afterSequence}`,
      getHeaders: async () => ({}),
      parseEvent: parseGenerationWireEvent,
      getReplayCursor: () => 9,
      onEvent,
    });

    await Promise.resolve();
    const first = FakeXMLHttpRequest.current;
    if (!first) throw new Error('Expected initial XHR');
    first.push(
      'data: {"version":1,"generationId":"g1","sequence":1,"type":"generation.phase_changed","payload":{"type":"generation.phase_changed","phase":"preparing"}}\n\n',
    );
    first.onerror?.();

    await new Promise((resolve) => setTimeout(resolve, 0));
    const replay = FakeXMLHttpRequest.current;
    if (!replay || replay === first) throw new Error('Expected replay XHR');
    replay.finish(
      200,
      'data: {"version":1,"generationId":"g1","sequence":2,"type":"generation.phase_changed","payload":{"type":"generation.phase_changed","phase":"saving"}}\n\n',
    );
    await promise;

    expect(first.method).toBe('POST');
    expect(replay.method).toBe('GET');
    expect(replay.url).toContain('afterSequence=9');
    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('does not resume when the domain event handler fails', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
    const promise = consumeGenerationSseXhr({
      url: 'https://example.test/generations/g1/stream',
      payload: { generationId: 'g1' },
      replayUrl: (afterSequence) => `https://example.test/replay?afterSequence=${afterSequence}`,
      getHeaders: async () => ({}),
      parseEvent: parseGenerationWireEvent,
      onEvent: () => {
        throw new Error('domain failure');
      },
      getReplayCursor: () => 0,
    });

    await Promise.resolve();
    const first = FakeXMLHttpRequest.current;
    if (!first) throw new Error('Expected initial XHR');
    first.finish(
      200,
      'data: {"version":1,"generationId":"g1","sequence":1,"type":"generation.phase_changed","payload":{"type":"generation.phase_changed","phase":"preparing"}}\n\n',
    );

    await expect(promise).rejects.toThrow('domain failure');
    expect(FakeXMLHttpRequest.current).toBe(first);
  });

  it('does not resume an abort error from request setup', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);

    await expect(
      consumeGenerationSseXhr({
        url: 'https://example.test/generations/g1/stream',
        payload: { generationId: 'g1' },
        replayUrl: (afterSequence) => `https://example.test/replay?afterSequence=${afterSequence}`,
        getHeaders: async () => {
          throw new DOMException('Aborted', 'AbortError');
        },
        onEvent: vi.fn(),
        getReplayCursor: () => 0,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(FakeXMLHttpRequest.current).toBeNull();
  });
});
