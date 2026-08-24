import { describe, expect, it } from 'vitest';

import { normalizeChatTitle } from './chat-title';

describe('normalizeChatTitle', () => {
  it('collapses whitespace and limits the title length', () => {
    expect(normalizeChatTitle('  Plan   the next release  ')).toBe('Plan the next release');
    expect(normalizeChatTitle('a'.repeat(100))).toHaveLength(80);
  });

  it('uses the default title for blank input', () => {
    expect(normalizeChatTitle('  ')).toBe('New chat');
  });
});
