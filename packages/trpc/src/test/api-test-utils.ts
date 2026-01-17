import type { Queue } from 'bullmq'
import type { Hono } from 'hono'
import { afterAll, beforeAll, beforeEach, vi } from 'vitest'
import type { AppEnv } from '../src/server.js'
import { createServer } from '../src/server.js'

/**
 * Global mock instances for reuse across tests
 */
export const globalMocks = {
  // Queue mock
  queue: {
    add: vi.fn(),
    close: vi.fn(() => Promise.resolve()),
    getJob: vi.fn(),
    getJobs: vi.fn(() => Promise.resolve([])),
    // Add other queue methods as needed
  } as Partial<Queue>,

  // Rate limit middleware mocks
  rateLimit: vi.fn((_c, next) => {
    return next()
  }),

  rateLimitImport: vi.fn((_c, next) => {
    return next()
  }),
}

/**
 * Creates a test server instance with common setup
 */
export const createTestServer = async (_options: { logger?: boolean } = {}) => {
  const server = createServer()
  if (!server) {
    throw new Error('Server is null')
  }

  // Override the queues middleware for testing with mock queues
  server.use('*', async (c, next) => {
    const mockQueues = {
      plaidSync: globalMocks.queue as any,
      importTransactions: globalMocks.queue as any,
      placePhotoEnrich: globalMocks.queue as any,
    }
    c.set('queues', mockQueues)
    await next()
  })

  return server
}

/**
 * Common test lifecycle hooks for API route tests
 */
export const useApiTestLifecycle = () => {
  let testServer: Hono<AppEnv>

  beforeAll(async () => {
    testServer = await createTestServer()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    // Hono doesn't need explicit cleanup like Fastify
    if (testServer) {
      // No close method needed for Hono
    }
  })

  return {
    getServer: () => testServer,
  }
}

/**
 * Common response type for API tests
 */
export interface ApiResponse {
  success?: boolean
  message?: string
  error?: string
  details?: unknown
  [key: string]: unknown
}

/**
 * Helper for making authenticated requests
 */
export const makeAuthenticatedRequest = async (
  server: Hono<AppEnv>,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    url: string
    payload?: Record<string, unknown>
    headers?: Record<string, string | null>
  }
) => {
  const { method, url, payload, headers = {} } = options

  const reqOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    } as Record<string, string>,
  }

  if (payload) {
    reqOptions.body = JSON.stringify(payload)
  }

  return server.request(url, reqOptions)
}

/**
 * Helper to assert success response
 */
export const assertSuccessResponse = async <T = any>(
  response: Response
): Promise<T> => {
  const body = (await response.json()) as T
  if (!response.ok) {
    console.error('Expected success but got error:', body)
  }
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
  return body
}

/**
 * Helper to assert error response
 */
export const assertErrorResponse = async <T = any>(
  response: Response,
  expectedStatus?: number
): Promise<T> => {
  const body = (await response.json()) as T
  if (expectedStatus) {
    expect(response.status).toBe(expectedStatus)
  } else {
    expect(response.status).toBeGreaterThanOrEqual(400)
  }
  return body
}
