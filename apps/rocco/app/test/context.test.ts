import crypto from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db'
import { createContext } from '../lib/trpc/context'
import { users } from '@hominem/data/schema'
import { eq } from 'drizzle-orm'
import { createTestUser } from '@hominem/utils/test-fixtures'

// Mock the dependencies
vi.mock('../lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('../lib/redis', () => ({
  cacheKeys: {
    token: vi.fn((token: string) => `token:${token}`),
  },
  cacheUtils: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

describe('tRPC Context', () => {
  const testUserId = crypto.randomUUID()
  const testUserId2 = crypto.randomUUID()

  beforeAll(async () => {
    // Create test users in the database
    await createTestUser({
      id: testUserId,
      name: 'Test User',
    })
    await createTestUser({
      id: testUserId2,
      name: null,
    })
  })

  afterAll(async () => {
    // Clean up test users
    await db.delete(users).where(eq(users.id, testUserId))
    await db.delete(users).where(eq(users.id, testUserId2))
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return context with db when no request is provided', async () => {
    const context = await createContext()

    expect(context).toEqual({
      db: expect.any(Object),
    })
    expect(context.user).toBeUndefined()
  })

  it('should return context with db when no authorization header is present', async () => {
    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {},
    })

    const context = await createContext(mockRequest)

    expect(context).toEqual({
      db: expect.any(Object),
    })
    expect(context.user).toBeUndefined()
  })

  it('should handle malformed authorization header', async () => {
    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {
        authorization: 'InvalidToken',
      },
    })

    const context = await createContext(mockRequest)

    expect(context).toEqual({
      db: expect.any(Object),
    })
    expect(context.user).toBeUndefined()
  })

  it('should validate token and return user context when valid', async () => {
    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {
        'x-user-id': testUserId,
      },
    })

    const context = await createContext(mockRequest)

    expect(context).toEqual({
      db: expect.any(Object),
      user: expect.objectContaining({
        id: testUserId,
        email: `test-${testUserId}@example.com`,
        name: 'Test User',
        // In our updated fixture logic, if only id is provided, supabaseId = id
        // The mock user creation sets them equal if one is missing
        supabaseId: testUserId,
      }),
    })
  })

  it('should use cached token when available', async () => {
    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {
        'x-user-id': testUserId,
      },
    })

    const context = await createContext(mockRequest)

    expect(context.user).toBeDefined()
    expect(context.user?.id).toBe(testUserId)
    expect(context.user?.email).toBe(`test-${testUserId}@example.com`)
    expect(context.user?.name).toBe('Test User')
  })

  it('should handle user without metadata', async () => {
    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {
        'x-user-id': testUserId2,
      },
    })

    const context = await createContext(mockRequest)

    expect(context.user).toMatchObject({
      id: testUserId2,
      email: `test-${testUserId2}@example.com`,
      supabaseId: testUserId2,
    })
    expect(context.user?.name).toBeFalsy() // null or undefined
  })
})
