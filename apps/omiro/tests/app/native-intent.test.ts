import { describe, expect, it } from 'vitest';

import { redirectSystemPath } from '~/app/+native-intent';

describe('native Time intents', () => {
  it('rewrites task deep links to the canonical Time workspace route', () => {
    expect(redirectSystemPath({ initial: true, path: 'time/task/task-1' })).toBe(
      '/(protected)/time/task/task-1',
    );
  });

  it('rewrites a seeded chat deep link to the blank New Chat route', () => {
    expect(redirectSystemPath({ initial: true, path: 'chat?seed=Hello' })).toBe(
      '/(protected)/new-chat?seed=Hello',
    );
  });

  it('rewrites event deep links to the canonical Time workspace route', () => {
    expect(redirectSystemPath({ initial: true, path: '/time/event/event-1' })).toBe(
      '/(protected)/time/event/event-1',
    );
  });
});
