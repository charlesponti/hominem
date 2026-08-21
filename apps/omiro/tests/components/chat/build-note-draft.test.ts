import type { ChatMessageItem } from '@hominem/chat';
import { describe, expect, it } from 'vitest';

import {
  buildNoteDraft,
  NOTE_TRANSCRIPT_MAX_CHARS,
  PRESET_INSTRUCTIONS,
} from '~/components/chat/build-note-draft';
import t from '~/translations';

function makeMessage(overrides: Partial<ChatMessageItem>): ChatMessageItem {
  return {
    id: overrides.id ?? 'msg-1',
    role: 'user',
    message: '',
    created_at: '2024-01-01T00:00:00.000Z',
    chat_id: 'chat-1',
    profile_id: 'profile-1',
    focus_ids: null,
    focus_items: null,
    referencedNotes: null,
    toolCalls: null,
    ...overrides,
  };
}

describe('buildNoteDraft', () => {
  it('passes through a normal transcript with the auto-derived title', () => {
    const messages = [
      makeMessage({ id: 'm1', role: 'user', message: 'What should I cook tonight?' }),
      makeMessage({ id: 'm2', role: 'assistant', message: 'How about a stir fry?' }),
    ];

    const draft = buildNoteDraft(messages);

    expect(draft.isTruncated).toBe(false);
    expect(draft.transcript).toContain('User: What should I cook tonight?');
    expect(draft.transcript).toContain('Assistant: How about a stir fry?');
    expect(draft.title).toBe('What should I cook tonight?');
  });

  it('tail-truncates an over-cap transcript at a block boundary, keeping the untruncated title', () => {
    const first = makeMessage({ id: 'm0', role: 'user', message: 'Original opening question' });
    const filler: ChatMessageItem[] = [];
    for (let i = 0; i < 400; i++) {
      filler.push(
        makeMessage({
          id: `m${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          message: 'x'.repeat(60),
        }),
      );
    }
    const last = makeMessage({ id: 'mLast', role: 'assistant', message: 'The final recent reply' });

    const draft = buildNoteDraft([first, ...filler, last]);

    expect(draft.isTruncated).toBe(true);
    expect(draft.transcript.length).toBeLessThanOrEqual(NOTE_TRANSCRIPT_MAX_CHARS);
    expect(draft.transcript.startsWith('[Earlier messages omitted]\n\n')).toBe(true);
    expect(draft.transcript).toContain('The final recent reply');
    expect(draft.transcript).not.toContain('Original opening question');
    // Title still reflects the first message, even though it fell out of the transcript.
    expect(draft.title).toBe('Original opening question');
  });

  it('produces an empty transcript and the default title for whitespace-only messages', () => {
    const messages = [
      makeMessage({ id: 'm1', role: 'user', message: '   ' }),
      makeMessage({ id: 'm2', role: 'assistant', message: '' }),
    ];

    const draft = buildNoteDraft(messages);

    expect(draft.transcript).toBe('');
    expect(draft.title).toBe('Untitled note');
    expect(draft.isTruncated).toBe(false);
  });

  it('does not produce an empty result when a single message alone exceeds the cap', () => {
    const huge = makeMessage({
      id: 'm1',
      role: 'user',
      message: 'y'.repeat(NOTE_TRANSCRIPT_MAX_CHARS + 5000),
    });

    const draft = buildNoteDraft([huge]);

    expect(draft.isTruncated).toBe(true);
    expect(draft.transcript.length).toBeGreaterThan(0);
    expect(draft.transcript.length).toBeLessThanOrEqual(NOTE_TRANSCRIPT_MAX_CHARS);
  });
});

describe('PRESET_INSTRUCTIONS', () => {
  it('has a full-sentence instruction for every note-draft preset', () => {
    for (const preset of t.chat.noteDraft.presets) {
      expect(PRESET_INSTRUCTIONS[preset]).toBeTruthy();
      expect(PRESET_INSTRUCTIONS[preset].length).toBeGreaterThan(10);
    }
  });
});
