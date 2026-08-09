import type { ChatMessageItem } from '@hominem/chat';
import { describe, expect, it } from 'vitest';

import { filterMessagesByQuery } from '~/services/chat/chat-search';

function message(id: string, text: string): ChatMessageItem {
  return {
    id,
    role: 'assistant',
    message: text,
    created_at: '',
    chat_id: 'chat-1',
    profile_id: '',
    focus_ids: null,
    focus_items: null,
    referencedNotes: null,
    toolCalls: null,
  } as ChatMessageItem;
}

describe('filterMessagesByQuery', () => {
  const messages = [
    message('1', 'Product design principles'),
    message('2', 'Key engineering tradeoffs'),
  ];

  it('returns all messages for an empty query', () => {
    expect(filterMessagesByQuery(messages, '')).toEqual(messages);
  });

  it('returns all messages for a whitespace-only query', () => {
    expect(filterMessagesByQuery(messages, '   ')).toEqual(messages);
  });

  it('matches case-insensitively on message text', () => {
    expect(filterMessagesByQuery(messages, 'DESIGN')).toEqual([messages[0]]);
  });

  it('matches partial substrings', () => {
    expect(filterMessagesByQuery(messages, 'engineer')).toEqual([messages[1]]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterMessagesByQuery(messages, 'unmatched')).toEqual([]);
  });
});
