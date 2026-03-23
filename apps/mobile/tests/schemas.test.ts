import { describe, it, expect } from 'vitest'
import {
  UserProfileSchema,
} from '../utils/validation/schemas'

describe('Zod Schemas', () => {
  describe('UserProfileSchema', () => {
    it('should validate a valid user profile', () => {
      const validProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      expect(() => UserProfileSchema.parse(validProfile)).not.toThrow()
    })

    it('should allow null email and name', () => {
      const profile = {
        id: 'user-123',
        email: null,
        name: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      expect(() => UserProfileSchema.parse(profile)).not.toThrow()
    })

    it('should reject invalid email format', () => {
      const invalidProfile = {
        id: 'user-123',
        email: 'not-an-email',
        name: 'Test',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      expect(() => UserProfileSchema.parse(invalidProfile)).toThrow()
    })

    it('should reject missing required fields', () => {
      const incompleteProfile = {
        id: 'user-123',
        // missing email, name, dates
      }

      expect(() => UserProfileSchema.parse(incompleteProfile)).toThrow()
    })
  })
})
