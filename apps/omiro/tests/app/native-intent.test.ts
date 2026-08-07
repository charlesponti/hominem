import { describe, expect, it } from 'vitest';

import { redirectSystemPath } from '~/app/+native-intent';

describe('native Time intents', () => {
  it('rewrites task deep links to the canonical Time workspace route', () => {
    expect(redirectSystemPath({ initial: true, path: 'time/task/task-1' })).toBe(
      '/(protected)/time/task/task-1',
    );
  });

  it('rewrites event deep links to the canonical Time workspace route', () => {
    expect(redirectSystemPath({ initial: true, path: '/time/event/event-1' })).toBe(
      '/(protected)/time/event/event-1',
    );
  });
});
