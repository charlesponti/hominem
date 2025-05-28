import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, expect, vi } from 'vitest'
import { createServer } from '../src/server.js'

/**
 * Global mock instances for reuse across tests
 */
export const globalMocks = {
  // Queue mock
  queue: {
    add: vi.fn(),
    close: vi.fn(() => Promise.resolve()),
  },

  // Auth middleware mock
  verifyAuth: vi.fn((request, reply, done) => {
    request.userId = 'test-user-id'
    done()
  }),

  // Rate limit middleware mocks
  rateLimit: vi.fn((request, reply, done) => {
    done()
  }),

  rateLimitImport: vi.fn((request, reply, done) => {
    done()
  }),
}

/**
 * Creates a test server instance with common setup
 */
export const createTestServer = async (options: { logger?: boolean } = {}) => {
  const server = await createServer({ logger: options.logger ?? false })
  if (!server) {
    throw new Error('Server is null')
  }

  // Setup mock queues
  server.queues = {
    plaidSync: globalMocks.queue,
    importTransactions: globalMocks.queue,
  } as unknown as typeof server.queues

  await server.ready()
  return server
}

/**
 * Common test lifecycle hooks for API route tests
 */
export const useApiTestLifecycle = () => {
  let testServer: FastifyInstance

  beforeAll(async () => {
    testServer = await createTestServer()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    if (testServer) {
      await testServer.close()
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
  server: FastifyInstance,
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
  if (options.payload) {
    headers['Content-Type'] = 'application/json'
  }

  return server.inject({
    method: options.method,
    url: options.url,
    payload: options.payload,
    headers,
  })
}

/**
 * Helper for parsing JSON responses with proper typing
 */
export const parseJsonResponse = <T = ApiResponse>(response: { body: string }): T => {
  return JSON.parse(response.body) as T
}

/**
 * Common assertion helpers
 */
export const assertSuccessResponse = (response: { statusCode: number; body: string }) => {
  const body = parseJsonResponse(response)
  expect(response.statusCode).toBe(200)
  // Don't require specific success field - let API consumers handle the response structure
  return body
}

export const assertErrorResponse = (
  response: { statusCode: number; body: string },
  expectedStatus = 500
) => {
  const body = parseJsonResponse(response)
  expect(response.statusCode).toBe(expectedStatus)
  // Focus on HTTP status codes rather than specific response structure
  if (expectedStatus >= 400) {
    // Allow various error response formats - either { success: false } or { error: "message" }
    const hasErrorIndicator =
      body.success === false || body.error !== undefined || body.message !== undefined
    expect(hasErrorIndicator).toBe(true)
  }
  return body
}
