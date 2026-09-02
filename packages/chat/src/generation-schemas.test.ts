import { describe, expect, it } from 'vitest';

import {
  chatMessageFileSchema,
  chatMessageToolCallSchema,
  chatMessageSnapshotSchema,
} from './generation-schemas';

describe('chat generation record schemas', () => {
  it('accepts canonical message records', () => {
    expect(
      chatMessageSnapshotSchema.parse({
        id: 'message-1',
        chatId: 'chat-1',
        userId: 'user-1',
        role: 'assistant',
        content: 'done',
        files: null,
        toolCalls: null,
        reasoning: null,
        parentMessageId: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      }),
    ).toMatchObject({ id: 'message-1', role: 'assistant' });
  });

  it('rejects arrays where JSON objects are required', () => {
    expect(() =>
      chatMessageToolCallSchema.parse({
        type: 'tool-call',
        toolName: 'lookup',
        toolCallId: 'call-1',
        args: [],
      }),
    ).toThrow();
  });

  it('rejects non-finite file sizes and unknown fields', () => {
    expect(() => chatMessageFileSchema.parse({ type: 'file', size: Number.NaN })).toThrow();
    expect(() => chatMessageFileSchema.parse({ type: 'file', legacyStatus: 'done' })).toThrow();
  });

  it('rejects invalid confirmation and execution combinations', () => {
    expect(() =>
      chatMessageToolCallSchema.parse({
        type: 'tool-call',
        toolName: 'delete',
        toolCallId: 'call-1',
        args: {},
        confirmationStatus: 'pending',
        executionStatus: 'completed',
      }),
    ).toThrow();
  });
});
