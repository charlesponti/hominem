import { describe, expect, it } from 'vitest';

import { logRedaction } from './evidence';

describe('evidence utilities', () => {
  describe('logRedaction', () => {
    it('does not throw', () => {
      expect(() => logRedaction('test-tool', ['salary', 'email'], 5)).not.toThrow();
    });

    it('does not throw with empty redacted fields', () => {
      expect(() => logRedaction('test-tool', [], 0)).not.toThrow();
    });
  });
});
