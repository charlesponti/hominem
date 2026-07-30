import { describe, expect, it } from 'vitest';

import { isValidEmail, isValidOtp, normalizeEmail, normalizeOtp } from './validation.js';

describe('auth validation helpers', () => {
  it('normalizes email addresses', () => {
    expect(normalizeEmail('  Foo.Bar@Example.com  ')).toBe('foo.bar@example.com');
    expect(normalizeEmail('\tUSER@EXAMPLE.COM\n')).toBe('user@example.com');
  });

  it('normalizes otp values', () => {
    expect(normalizeOtp(' 12-34 56 ')).toBe('123456');
    expect(normalizeOtp('abc1234567def')).toBe('123456');
  });

  it('validates normalized email and otp values', () => {
    expect(isValidEmail('  Foo.Bar@Example.com  ')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidOtp('12-34 56')).toBe(true);
    expect(isValidOtp('12345')).toBe(false);
  });
});
