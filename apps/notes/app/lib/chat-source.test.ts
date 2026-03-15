import { deriveSessionSource } from '@hominem/chat-services/types';
import { describe, expect, it } from 'vitest';

describe('chat source', () => {
  it('preserves the first user thought when the session has no artifact context', () => {
    expect(
      deriveSessionSource({
        messages: [
          { role: 'assistant', content: 'How should we organize this?' },
          { role: 'user', content: 'Turn this into a launch checklist' },
        ],
      }),
    ).toEqual({
      kind: 'thought',
      preview: 'Turn this into a launch checklist',
    });
  });
});
