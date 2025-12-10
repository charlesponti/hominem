import crypto from 'node:crypto'
import { createTestUser } from '@hominem/data/fixtures'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../lib/trpc/context'

// Mock the dependencies
vi.mock('../lib/supabase/server', () => ({
  createClient: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return context with db when no request is provided', async () => {
    const context = await createContext()

    expect(context).toMatchObject({
      user: null,
    })
  })

  it('should return context with db when no authorization header is present', async () => {
    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {},
    })

    const context = await createContext(mockRequest)

    expect(context).toMatchObject({
      user: null,
    })
  })

  it('should handle malformed authorization header', async () => {
    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {
        authorization: 'InvalidToken',
      },
    })

    const context = await createContext(mockRequest)

    expect(context).toMatchObject({
      user: null,
    })
  })

  it('should validate token and return user context when valid', async () => {
    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {
        'x-user-id': testUserId,
      },
    })

    const context = await createContext(mockRequest)

    expect(context).toMatchObject({
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
  })
})
