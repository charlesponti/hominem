import { describe, expect, it } from 'vitest';

import { inferComposerEntryKind } from '~/components/composer/composerInference';

describe('inferComposerEntryKind', () => {
  it.each([
    ['a quick thought', 'chat'],
    ['this is a long unstructured paragraph that stays conversational', 'chat'],
    ['line one\nline two', 'note'],
    ['# Heading', 'note'],
    ['- bullet', 'note'],
    ['1. numbered item', 'note'],
    ['- [ ] checklist', 'note'],
    ['', 'note'],
  ])('classifies %j as %s', (message, expected) => {
    expect(inferComposerEntryKind(message)).toBe(expected);
  });
});
