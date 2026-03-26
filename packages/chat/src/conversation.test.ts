import { describe, expect, it } from 'vitest';

import {
  findRegenerationSourceMessage,
  normalizeMessageContent,
  normalizeSendInput,
  toSessionArtifactMessages,
} from './conversation';

describe('conversation', () => {
  it('normalizes blank message content to null', () => {
    expect(normalizeMessageContent('  ')).toBeNull();
    expect(normalizeMessageContent(' hello ')).toBe('hello');
  });

  it('normalizes send input and preserves file ids', () => {
    expect(normalizeSendInput({ message: ' hello ', fileIds: ['file-1'] })).toEqual({
      message: 'hello',
      fileIds: ['file-1'],
    });
    expect(normalizeSendInput({ message: ' ', fileIds: [] })).toBeNull();
  });

  it('builds session artifact messages from mixed conversation records', () => {
    expect(
      toSessionArtifactMessages(
        [
          { id: '1', role: 'user', text: 'Hello' },
          { id: '2', role: 'assistant', text: 'Hi' },
          { id: '3', role: 'other', text: 'ignored' },
        ],
        (message) => message.text,
      ),
    ).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ]);
  });

  it('finds the previous non-empty user message for regeneration', () => {
    expect(
      findRegenerationSourceMessage(
        [
          { id: 'user-1', role: 'user', text: '  First prompt  ' },
          { id: 'assistant-1', role: 'assistant', text: 'Response' },
          { id: 'user-2', role: 'user', text: '   ' },
          { id: 'assistant-2', role: 'assistant', text: 'Another response' },
        ],
        'assistant-2',
        (message) => message.text,
      ),
    ).toBe('First prompt');
  });
});
