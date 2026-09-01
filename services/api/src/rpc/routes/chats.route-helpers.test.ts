import { describe, expect, it } from 'vitest';

import { getChatId, getGenerationId, getMessageId } from './chats.route-helpers';

function context(params: Record<string, string | undefined>) {
  return { req: { param: (name: string) => params[name] } };
}

describe('chat route resource identifiers', () => {
  it('accepts UUID chat and message identifiers', () => {
    expect(getChatId(context({ id: '00000000-0000-4000-8000-000000000001' }))).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
    expect(getMessageId(context({ messageId: '00000000-0000-4000-8000-000000000002' }))).toBe(
      '00000000-0000-4000-8000-000000000002',
    );
    expect(getGenerationId(context({ generationId: '00000000-0000-4000-8000-000000000003' }))).toBe(
      '00000000-0000-4000-8000-000000000003',
    );
  });

  it('rejects missing and malformed identifiers as validation errors', () => {
    expect(() => getChatId(context({ id: 'not-a-uuid' }))).toThrow('Invalid chat id');
    expect(() => getGenerationId(context({ generationId: 'not-a-uuid' }))).toThrow(
      'Invalid generation id',
    );
    expect(() => getMessageId(context({ messageId: undefined }))).toThrow('message id is required');
  });
});
