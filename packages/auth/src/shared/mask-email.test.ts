import { describe, expect, it } from 'vitest';

import { maskEmail } from './mask-email.js';

describe('maskEmail', () => {
  it('masks long local parts after the first two characters', () => {
    expect(maskEmail('charles@example.com')).toBe('ch***@example.com');
  });

  it('masks short local parts after the first character', () => {
    expect(maskEmail('ab@example.com')).toBe('a***@example.com');
  });

  it('masks one-character local parts', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
  });

  it('returns invalid inputs unchanged', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email');
  });
});
