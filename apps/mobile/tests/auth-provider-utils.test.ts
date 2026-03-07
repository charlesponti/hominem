import { describe, expect, it } from 'vitest'

import { extractSessionAccessToken, mapAuthStatus, resolveIsLoadingAuth } from '../utils/auth/provider-utils'

describe('auth provider utils', () => {
  describe('mapAuthStatus', () => {
    it('passes through signed_out state', () => {
      expect(mapAuthStatus('signed_out')).toBe('signed_out')
    })

    it('passes through signed_in state', () => {
      expect(mapAuthStatus('signed_in')).toBe('signed_in')
    })

    it('passes through booting and degraded', () => {
      expect(mapAuthStatus('booting')).toBe('booting')
      expect(mapAuthStatus('degraded')).toBe('degraded')
    })
  })

  describe('resolveIsLoadingAuth', () => {
    it('is true while booting', () => {
      expect(
        resolveIsLoadingAuth({
          status: 'booting',
          user: null,
          error: null,
          isLoading: false,
        }),
      ).toBe(true)
    })

    it('is true while explicit loading flag is set', () => {
      expect(
        resolveIsLoadingAuth({
          status: 'signed_out',
          user: null,
          error: null,
          isLoading: true,
        }),
      ).toBe(true)
    })

    it('is false when not booting and not loading', () => {
      expect(
        resolveIsLoadingAuth({
          status: 'signed_in',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          error: null,
          isLoading: false,
        }),
      ).toBe(false)
    })
  })

  describe('extractSessionAccessToken', () => {
    it('prefers accessToken when present', () => {
      const token = extractSessionAccessToken({
        session: {
          accessToken: 'access-123',
          token: 'fallback-123',
        },
      })
      expect(token).toBe('access-123')
    })

    it('falls back to token when accessToken missing', () => {
      const token = extractSessionAccessToken({
        session: {
          token: 'fallback-123',
        },
      })
      expect(token).toBe('fallback-123')
    })

    it('returns null for empty/missing token payloads', () => {
      expect(extractSessionAccessToken(null)).toBeNull()
      expect(extractSessionAccessToken({})).toBeNull()
      expect(extractSessionAccessToken({ session: null })).toBeNull()
      expect(extractSessionAccessToken({ session: { accessToken: '' } })).toBeNull()
      expect(extractSessionAccessToken({ session: { token: '' } })).toBeNull()
    })
  })
})
