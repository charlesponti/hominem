import { describe, expect, it } from 'vitest';

import { decodeSSEFrame } from './sse';

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
  });
});
