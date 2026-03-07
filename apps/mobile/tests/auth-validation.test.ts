import { describe, expect, it } from 'vitest'

import { isValidEmail, isValidOtp, normalizeEmail, normalizeOtp } from '../utils/auth/validation'

describe('auth validation', () => {
  it('normalizes email and otp values', () => {
    expect(normalizeEmail('  USER@Example.COM ')).toBe('user@example.com')
    expect(normalizeOtp(' 123456 ')).toBe('123456')
    expect(normalizeOtp('12 34-56')).toBe('123456')
    expect(normalizeOtp('1234567')).toBe('123456')
  })

  it('validates email format', () => {
    expect(isValidEmail('person@example.com')).toBe(true)
    expect(isValidEmail('person+test@example.co')).toBe(true)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('foo@bar')).toBe(false)
  })

  it('validates six-digit otp format', () => {
    expect(isValidOtp('123456')).toBe(true)
    expect(isValidOtp('12345')).toBe(false)
    expect(isValidOtp('12 34-56')).toBe(true)
    expect(isValidOtp('1234567')).toBe(true)
    expect(isValidOtp('abcdef')).toBe(false)
  })
})
