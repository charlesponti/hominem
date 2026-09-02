import { describe, expect, it } from 'vitest';

import { chatMessageFileSchema, chatMessageToolCallSchema } from './generation-schemas';

describe('chat message record schemas', () => {
  it('accepts valid files and tool calls', () => {
    expect(
      chatMessageFileSchema.parse({
        type: 'image',
        fileId: 'file-1',
        size: 42,
        metadata: { width: 100 },
      }),
    ).toMatchObject({ type: 'image', fileId: 'file-1' });
    expect(
      chatMessageToolCallSchema.parse({
        type: 'tool-call',
        toolName: 'search',
        toolCallId: 'call-1',
        args: { query: 'notes' },
        confirmationStatus: 'approved',
        executionStatus: 'completed',
      }),
    ).toMatchObject({ toolName: 'search', toolCallId: 'call-1' });
  });

  it('rejects arrays, invalid numbers, empty identifiers, legacy fields, and unknown fields', () => {
    expect(() => chatMessageFileSchema.parse({ type: 'file', metadata: [] })).toThrow();
    expect(() => chatMessageFileSchema.parse({ type: 'file', size: Number.NaN })).toThrow();
    expect(() => chatMessageFileSchema.parse({ type: 'file', size: -1 })).toThrow();
    expect(() =>
      chatMessageToolCallSchema.parse({
        type: 'tool-call',
        toolName: '',
        toolCallId: 'call-1',
        args: {},
      }),
    ).toThrow();
    expect(() =>
      chatMessageToolCallSchema.parse({
        type: 'tool-call',
        toolName: 'search',
        toolCallId: 'call-1',
        args: [],
      }),
    ).toThrow();
    expect(() =>
      chatMessageToolCallSchema.parse({
        type: 'tool-call',
        toolName: 'search',
        toolCallId: 'call-1',
        args: {},
        status: 'completed',
      }),
    ).toThrow();
  });

  it('rejects invalid confirmation and execution combinations', () => {
    expect(() =>
      chatMessageToolCallSchema.parse({
        type: 'tool-call',
        toolName: 'delete_note',
        toolCallId: 'call-1',
        args: {},
        confirmationStatus: 'pending',
        executionStatus: 'completed',
      }),
    ).toThrow();
    expect(() =>
      chatMessageToolCallSchema.parse({
        type: 'tool-call',
        toolName: 'delete_note',
        toolCallId: 'call-1',
        args: {},
        confirmationStatus: 'rejected',
        executionStatus: 'running',
      }),
    ).toThrow();
  });
});
