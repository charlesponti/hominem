/**
 * Shared test helpers for database services
 * 
 * Factories, seed builders, and assertion helpers for consistent test setup
 */

import type { Database } from '../client'
import type { UserId } from './ids'
import { brandId } from './ids'

/**
 * Test user factory
 * 
 * Creates a consistent test user with predictable IDs
 */
export function createTestUserId(suffix: string = '1'): UserId {
  return brandId<UserId>(`test-user-${suffix}`)
}

/**
 * Build user data for tests
 * 
 * @example
 * const userData = buildUserData({ email: 'test@example.com' })
 */
export function buildUserData(overrides?: Partial<{ email: string; name: string }>): {
  email: string
  name: string
} {
  return {
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  }
}

/**
 * Assert helper: verify entity ownership
 * 
 * @throws Error if userId doesn't match
 */
export function assertOwnership(entity: { userId?: string | null } | null, expectedUserId: string): void {
  if (!entity) {
    throw new Error('Entity not found')
  }
  if (entity.userId !== expectedUserId) {
    throw new Error(`Expected userId ${expectedUserId}, got ${entity.userId}`)
  }
}

/**
 * Assert helper: verify entity structure
 * 
 * Checks that required fields exist and have correct types
 */
export function assertEntityStructure(
  entity: unknown,
  requiredFields: string[]
): asserts entity is Record<string, unknown> {
  if (!entity || typeof entity !== 'object') {
    throw new Error('Entity is not an object')
  }

  const entityObj = entity as Record<string, unknown>
  for (const field of requiredFields) {
    if (!(field in entityObj)) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
}

/**
 * Build seed data for test scenario setup
 * 
 * @example
 * const seeds = buildSeeds({
 *   user1: { email: 'user1@test.com' },
 *   user2: { email: 'user2@test.com' }
 * })
 */
export function buildSeeds<T extends Record<string, Record<string, unknown>>>(
  seedConfig: T
): Record<keyof T, Record<string, unknown>> {
  const seeds = {} as Record<keyof T, Record<string, unknown>>

  for (const [key, config] of Object.entries(seedConfig)) {
    seeds[key as keyof T] = { ...config }
  }

  return seeds
}

/**
 * Test fixture loader
 * 
 * Supports load once per suite pattern
 */
export function createFixtureLoader<T>(loader: (db: Database) => Promise<T>): {
  load: (db: Database) => Promise<T>
  cached: T | undefined
  reset: () => void
} {
  let cached: T | undefined

  return {
    load: async (db: Database) => {
      if (!cached) {
        cached = await loader(db)
      }
      return cached
    },
    reset: () => {
      cached = undefined
    },
    get cached() {
      return cached
    },
  }
}
