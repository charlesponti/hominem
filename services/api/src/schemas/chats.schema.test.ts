import { describe, expect, it } from 'vitest';

import { ChatsAgentOperationSchema } from './chats.schema';

describe('ChatsAgentOperationSchema', () => {
  it('accepts a send operation with typed options', () => {
    expect(
      ChatsAgentOperationSchema.parse({
        kind: 'send',
        fileIds: ['11111111-1111-4111-8111-111111111111'],
        responseLength: 'long',
        responseModality: 'audio',
      }),
    ).toEqual({
      kind: 'send',
      fileIds: ['11111111-1111-4111-8111-111111111111'],
      responseLength: 'long',
      responseModality: 'audio',
    });
  });

  it('requires a valid assistant message id for regeneration', () => {
    expect(() =>
      ChatsAgentOperationSchema.parse({ kind: 'regenerate', assistantMessageId: 'message-1' }),
    ).toThrow();
  });

  it('accepts resume as a distinct operation', () => {
    expect(ChatsAgentOperationSchema.parse({ kind: 'resume' })).toEqual({ kind: 'resume' });
  });
});
