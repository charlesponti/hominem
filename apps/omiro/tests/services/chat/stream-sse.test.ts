import { afterEach, describe, expect, it, vi } from 'vitest';

import { streamSSE } from '~/services/chat/stream-sse';

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
}

async function startStream(onEvent = vi.fn(), onDone = vi.fn()) {
  const promise = streamSSE({
    url: 'https://example.test/stream',
    payload: { message: 'hello' },
    getHeaders: async () => ({ authorization: 'Bearer token' }),
    onEvent,
    onDone,
  });
  await Promise.resolve();
  const xhr = FakeXMLHttpRequest.current;
  if (!xhr) throw new Error('Expected stream to create an XHR instance');
  return { onDone, onEvent, promise, xhr };
}

describe('streamSSE', () => {
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

  it('rejects failed HTTP responses', async () => {
    globalThis.XMLHttpRequest = FakeXMLHttpRequest as never;
    const { promise, xhr } = await startStream();

    xhr.finish(500);

    await expect(promise).rejects.toThrow('SSE stream failed: HTTP 500');
  });
});
