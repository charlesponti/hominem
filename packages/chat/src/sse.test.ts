import { describe, expect, it } from 'vitest';

import { createSseDecoder, decodeSSEFrame, finishSse, pushSseChunk } from './sse';

describe('decodeSSEFrame', () => {
  it('joins data lines and decodes JSON events', () => {
    expect(decodeSSEFrame('event: message\ndata: {"type":"text-\ndata: delta"}\n')).toEqual({
      kind: 'event',
      data: '{"type":"text-\ndelta"}',
    });
  });

  it('recognizes the done sentinel', () => {
    expect(decodeSSEFrame('data: [DONE]\r\n')).toEqual({ kind: 'done' });
  });

  it('ignores comments and frames without data', () => {
    expect(decodeSSEFrame(': keep-alive\n')).toEqual({ kind: 'empty' });
    expect(decodeSSEFrame('event: message\n')).toEqual({ kind: 'empty' });

    const outputs = pushSseChunk(createSseDecoder(), 'event: message\n\ndata:{"type":"ok"}\n\n');
    expect(outputs.outputs).toEqual([{ kind: 'empty' }, { kind: 'event', event: { type: 'ok' } }]);
  });

  it('folds chunks into immutable decoded outputs', () => {
    const initial = createSseDecoder();
    const first = pushSseChunk(initial, 'data: {"type":"status",\n');
    const second = pushSseChunk(first.state, 'data: "status":"ready"}\n\n');

    expect(initial).toEqual({ buffer: '' });
    expect(first.outputs).toEqual([]);
    expect(second.outputs).toEqual([{ kind: 'event', event: { type: 'status', status: 'ready' } }]);
    expect(second.state).toEqual({ buffer: '' });
  });

  it('emits done and malformed outputs without throwing', () => {
    const decoded = pushSseChunk(createSseDecoder(), 'data: {bad}\n\ndata: [DONE]\n\n');

    expect(decoded.outputs[0]?.kind).toBe('malformed');
    expect(decoded.outputs[1]).toEqual({ kind: 'done' });
  });

  it('flushes an unterminated final event', () => {
    const pushed = pushSseChunk(createSseDecoder(), 'data: {"type":"final"}');

    expect(finishSse(pushed.state).outputs).toEqual([{ kind: 'event', event: { type: 'final' } }]);
  });

  it('finishes an empty decoder without producing output', () => {
    expect(finishSse(createSseDecoder())).toEqual({
      state: createSseDecoder(),
      outputs: [],
    });
  });
});
