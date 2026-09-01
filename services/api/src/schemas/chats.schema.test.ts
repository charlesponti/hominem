import { describe, expect, it } from 'vitest';

import { ChatsToolCallRespondSchema } from './chats.schema';

describe('chat tool-call response contract', () => {
  it('derives the generation from the owned awaiting run', () => {
    expect(ChatsToolCallRespondSchema.parse({ approved: true })).toEqual({ approved: true });
    expect(() =>
      ChatsToolCallRespondSchema.parse({ approved: true, generationId: 'client-generated' }),
    ).toThrow();
  });
});
