import { describe, expect, it } from 'vitest';

import { isObject } from './object';

describe('isObject', () => {
  it.each([{}, new Date(), /pattern/])('accepts non-array objects', (value) => {
    expect(isObject(value)).toBe(true);
  });

  it.each([null, undefined, 'text', 0, false, [], () => undefined])(
    'rejects non-objects',
    (value) => {
      expect(isObject(value)).toBe(false);
    },
  );
});
