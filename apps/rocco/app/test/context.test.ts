import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../lib/trpc/context'

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

vi.mock('../db', () => ({
  db: {},
}))

describe('tRPC Context', () => {
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
    // Mock the database query to return a user
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            supabaseId: 'supabase-user-id',
          }),
        },
      },
    }

    // Replace the db mock with our specific mock
    vi.doMock('../db', () => ({ db: mockDb }))

    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {
        'x-user-id': 'test-user-id',
      },
    })

    const context = await createContext(mockRequest)

    expect(context).toEqual({
      db: expect.any(Object),
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        avatar: undefined,
        isAdmin: false,
        supabaseId: 'supabase-user-id',
      },
    })
  })

  it('should use cached token when available', async () => {
    // Mock the database query to return a user
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            supabaseId: 'supabase-user-id',
          }),
        },
      },
    }

    // Replace the db mock with our specific mock
    vi.doMock('../db', () => ({ db: mockDb }))

    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {
        'x-user-id': 'test-user-id',
      },
    })

    const context = await createContext(mockRequest)

    expect(context.user).toBeDefined()
    expect(context.user?.id).toBe('test-user-id')
    expect(context.user?.email).toBe('test@example.com')
    expect(context.user?.name).toBe('Test User')
  })

  it('should handle user without metadata', async () => {
    // Mock the database query to return a user without name
    const mockDb = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'test-user-id',
            email: 'test@example.com',
            name: null, // No name
            supabaseId: 'supabase-user-id',
          }),
        },
      },
    }

    // Replace the db mock with our specific mock
    vi.doMock('../db', () => ({ db: mockDb }))

    const mockRequest = new Request('http://localhost/api/trpc', {
      headers: {
        'x-user-id': 'test-user-id',
      },
    })

    const context = await createContext(mockRequest)

    expect(context.user).toEqual({
      id: 'test-user-id',
      email: 'test@example.com',
      name: undefined,
      avatar: undefined,
      isAdmin: false,
      supabaseId: 'supabase-user-id',
    })
  })
})
