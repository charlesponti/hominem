import { afterEach, describe, expect, it, vi } from 'vitest';

import { consumeSseXhr } from '~/services/chat/consume-sse-xhr';

class FakeXMLHttpRequest {
  static current: FakeXMLHttpRequest | null = null;

  onerror: (() => void) | null = null;
  onreadystatechange: (() => void) | null = null;
  readyState = 0;
  responseText = '';
  status = 200;
  headers: Record<string, string> = {};

  constructor() {
    FakeXMLHttpRequest.current = this;
  }

  abort() {}

  open() {}

  send() {}

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

async function startStream(onEvent = vi.fn(), onDone = vi.fn(), signal?: AbortSignal) {
  const promise = consumeSseXhr({
    url: 'https://example.test/stream',
    payload: { message: 'hello' },
    getHeaders: async () => ({ authorization: 'Bearer token' }),
    onEvent,
    onDone,
    signal,
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

  it('parses complete SSE chunks', async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as never;
    const { onDone, onEvent, promise, xhr } = await startStream();

    xhr.finish(200, 'data: {"type":"chunk","chunk":"hello"}\n\ndata: [DONE]\n\n');
    await promise;

    expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', chunk: 'hello' });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('preserves split SSE frames until they are complete', async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as never;
    const { onEvent, promise, xhr } = await startStream();

    xhr.push('data: {"type":"chu');
    xhr.push('nk","chunk":"hel');
    xhr.push('lo"}\n\n');
    xhr.finish(200, 'data: [DONE]\n\n');
    await promise;

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', chunk: 'hello' });
  });

  it('rejects when the server sends an error frame', async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as never;
    const { promise, xhr } = await startStream();

    xhr.finish(200, 'data: {"type":"error","message":"stream failed"}\n\n');

    await expect(promise).rejects.toThrow('stream failed');
  });

  it('uses the error field when an error frame has no message', async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as never;
    const { promise, xhr } = await startStream();

    xhr.finish(200, 'data: {"error":"fallback error"}\n\n');

    await expect(promise).rejects.toThrow('fallback error');
  });

  it('rejects failed HTTP responses', async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as never;
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
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as never;
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
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as never;
    const { promise, xhr } = await startStream();

    xhr.finish(200, 'data: {"type":"error","message":"partial failure"}');

    await expect(promise).rejects.toThrow('partial failure');
  });

  it('aborts the XHR and rejects when the signal is cancelled', async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as never;
    const controller = new AbortController();
    const { promise, xhr } = await startStream(vi.fn(), vi.fn(), controller.signal);

    controller.abort();
    xhr.notifyReadyState(3);
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
