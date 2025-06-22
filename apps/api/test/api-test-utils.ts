import type { Queue } from 'bullmq'
import type { Hono } from 'hono'
import { afterAll, beforeAll, beforeEach, expect, vi } from 'vitest'
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
    getJobs: vi.fn(),
    // Add other queue methods as needed
  } as Partial<Queue>,

  // Auth middleware mock
  verifyAuth: vi.fn((c, next) => {
    c.set('userId', 'test-user-id')
    return next()
  }),

  // Rate limit middleware mocks
  rateLimit: vi.fn((c, next) => {
    return next()
  }),

  rateLimitImport: vi.fn((c, next) => {
    return next()
  }),
}

/**
 * Creates a test server instance with common setup
 */
export const createTestServer = async (options: { logger?: boolean } = {}) => {
  const server = createServer()
  if (!server) {
    throw new Error('Server is null')
  }

  // Override the queues middleware for testing with mock queues
  server.use('*', async (c, next) => {
    const mockQueues = {
      plaidSync: globalMocks.queue,
      importTransactions: globalMocks.queue,
    }
    // @ts-expect-error - Using mock queues for testing
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
    headers?: Record<string, string>
  }
) => {
  const headers: Record<string, string> = {
    'x-user-id': 'test-user-id',
    ...options.headers,
  }

  const requestInit: RequestInit = {
    method: options.method,
    headers,
  }

  if (options.payload) {
    headers['Content-Type'] = 'application/json'
    requestInit.body = JSON.stringify(options.payload)
  }

  const request = new Request(`http://localhost${options.url}`, requestInit)
  return server.fetch(request)
}

/**
 * Helper for parsing JSON responses with proper typing
 */
export const parseJsonResponse = async <T = ApiResponse>(response: Response): Promise<T> => {
  return (await response.json()) as T
}

/**
 * Common assertion helpers
 */
export const assertSuccessResponse = async <T>(response: Response) => {
  const body = await parseJsonResponse<T>(response)
  expect(response.status).toBe(200)
  return body
}

export const assertErrorResponse = async (response: Response, expectedStatus = 500) => {
  const body = await parseJsonResponse(response)
  expect(response.status).toBe(expectedStatus)

  if (expectedStatus >= 400) {
    // Allow various error response formats - either { success: false } or { error: "message" }
    const hasErrorIndicator =
      body.success === false || body.error !== undefined || body.message !== undefined
    expect(hasErrorIndicator).toBe(true)
  }
  return body
}
