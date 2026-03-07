/**
 * Tests for MockAuthProvider
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MockAuthProvider } from '../providers/mock'
import { MOCK_USERS, DEFAULT_MOCK_USER } from '../mock-users'

describe('MockAuthProvider', () => {
  let provider: MockAuthProvider

  beforeEach(() => {
    provider = new MockAuthProvider()
  })

  describe('signIn', () => {
    it('should return a user and session on sign in', async () => {
      const response = await provider.signIn()

      expect(response.user).toBeDefined()
      expect(response.user.id).toBe(DEFAULT_MOCK_USER.id)
      expect(response.user.email).toBe(DEFAULT_MOCK_USER.email)
      expect(response.session).toBeDefined()
      expect(response.session.access_token).toBeDefined()
      expect(response.session.token_type).toBe('Bearer')
    })

    it('should return different tokens on each sign in', async () => {
      const response1 = await provider.signIn()
      const response2 = await provider.signIn()

      expect(response1.session.access_token).not.toBe(response2.session.access_token)
    })

    it('should set expiration time in the future', async () => {
      const response = await provider.signIn()
      const expiresAt = new Date(response.session.expires_at)
      const now = new Date()

      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime())
    })
  })

  describe('validateToken', () => {
    it('should validate a generated token', async () => {
      const { session, user } = await provider.signIn()
      const validated = provider.validateToken(session.access_token)

      expect(validated).not.toBeNull()
      expect(validated?.id).toBe(user.id)
    })

    it('should return null for invalid tokens', () => {
      const validated = provider.validateToken('invalid_token')
      expect(validated).toBeNull()
    })

    it('should return null for non-mock tokens', () => {
      const validated = provider.validateToken('real_token_123456789')
      expect(validated).toBeNull()
    })
  })

  describe('signOut', () => {
    it('should complete sign out successfully', async () => {
      await expect(provider.signOut()).resolves.toBeUndefined()
    })
  })

  describe('user selection', () => {
    it('should use default user when none specified', () => {
      const current = provider.getCurrentUser()
      expect(current.id).toBe(DEFAULT_MOCK_USER.id)
    })

    it('should use specified user if provided', () => {
      const provider2 = new MockAuthProvider('tester')
      const current = provider2.getCurrentUser()

      expect(current.id).toBe(MOCK_USERS.tester.id)
      expect(current.email).toBe(MOCK_USERS.tester.email)
    })

    it('should switch to different user', () => {
      const current1 = provider.getCurrentUser()
      expect(current1.id).toBe(DEFAULT_MOCK_USER.id)

      const switched = provider.switchUser('tester')
      expect(switched.id).toBe(MOCK_USERS.tester.id)

      const current2 = provider.getCurrentUser()
      expect(current2.id).toBe(MOCK_USERS.tester.id)
    })

    it('should throw error when switching to non-existent user', () => {
      expect(() => provider.switchUser('non-existent')).toThrow()
    })
  })
})
