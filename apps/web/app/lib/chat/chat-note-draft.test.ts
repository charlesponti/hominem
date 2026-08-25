import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { describe, expect, it } from 'vitest';

import { buildChatNoteDraft, CHAT_NOTE_MAX_LENGTH } from './chat-note-draft';

const message = (role: 'user' | 'assistant', content: string) =>
  ({ role, content }) as ChatMessageDto;

describe('buildChatNoteDraft', () => {
  it('preserves speaker labels and reports transcript truncation', () => {
    const draft = buildChatNoteDraft(
      [message('user', 'Question'), message('assistant', 'A'.repeat(CHAT_NOTE_MAX_LENGTH))],
      'Release notes',
    );

    expect(draft.title).toBe('Release notes');
    expect(draft.content).toContain('You:\nQuestion');
    expect(draft.truncated).toBe(true);
    expect(draft.content).toHaveLength(CHAT_NOTE_MAX_LENGTH);
  });

  it('does not create content from blank messages', () => {
    expect(buildChatNoteDraft([message('user', '  ')], '').content).toBe('');
  });
});
