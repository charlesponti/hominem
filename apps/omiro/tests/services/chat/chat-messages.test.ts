import { describe, expect, it } from 'vitest';

import { CHAT_MESSAGES_LIMIT } from '~/services/chat/use-chat-messages';

describe('chat messages', () => {
  it('keeps the mobile fetch limit aligned with the shared query key default', () => {
    expect(CHAT_MESSAGES_LIMIT).toBe(50);
  });
});
