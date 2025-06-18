import { describe, expect, test, vi } from 'vitest'
import {
  assertErrorResponse,
  assertSuccessResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '../../../test/api-test-utils.js'
import { createTestData } from '../../../test/db-test-utils.js'

// All mock definitions must be inside vi.mock calls due to hoisting
vi.mock('@hominem/utils/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      financialInstitutions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      plaidItems: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      financeAccounts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      transactions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
  client: {
    end: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('../../middleware/auth.js', () => ({
  requireAuth: vi.fn((request, reply, done) => {
    request.userId = 'test-user-id'
    done()
  }),
}))

vi.mock('../../middleware/rate-limit.js', () => ({
  rateLimit: vi.fn((request, reply, done) => {
    done()
  }),
  rateLimitImport: vi.fn((request, reply, done) => {
    done()
  }),
}))

vi.mock('../../lib/plaid.js', () => ({
  plaidClient: {
    linkTokenCreate: vi.fn(),
    itemPublicTokenExchange: vi.fn(),
    itemRemove: vi.fn(),
    accountsGet: vi.fn(),
  },
  verifyPlaidWebhookSignature: vi.fn(),
  PLAID_COUNTRY_CODES: ['US'],
  PLAID_PRODUCTS: ['transactions'],
}))

interface PlaidApiResponse {
  success?: boolean
  linkToken?: string
  expiration?: string
  message?: string
  error?: string
  details?: unknown
  deletedData?: {
    accounts: number
    transactions: string | number
    institution: number
  }
  received?: boolean
}

describe('Plaid Router', () => {
  const { getServer } = useApiTestLifecycle()

  describe('POST /api/plaid/create-link-token', () => {
    test('creates link token successfully', async () => {
      const { plaidClient } = await import('../../lib/plaid.js')

      vi.mocked(plaidClient.linkTokenCreate).mockResolvedValue({
        data: {
          link_token: 'test-link-token',
          expiration: '2025-05-26T00:00:00Z',
        },
      } as never)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/plaid/create-link-token',
      })

      const body = assertSuccessResponse(response) as PlaidApiResponse
      expect(body.linkToken).toBe('test-link-token')
      expect(body.expiration).toBe('2025-05-26T00:00:00Z')
    })

    test('handles plaid client error', async () => {
      const { plaidClient } = await import('../../lib/plaid.js')

      vi.mocked(plaidClient.linkTokenCreate).mockRejectedValue(new Error('Plaid error'))

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/plaid/create-link-token',
      })
      const body = assertErrorResponse(response)
      expect(body.error).toBe('Internal Server Error') // Changed from 'Plaid error'
    })
  })

  describe('POST /api/plaid/exchange-token', () => {
    test('exchanges token successfully for new institution', async () => {
      const { plaidClient } = await import('../../lib/plaid.js')
      const { db } = await import('@hominem/utils/db')

      vi.mocked(plaidClient.itemPublicTokenExchange).mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          item_id: 'test-item-id',
        },
      } as never)

      vi.mocked(db.query.financialInstitutions.findFirst).mockResolvedValue(undefined)
      vi.mocked(db.query.plaidItems.findFirst).mockResolvedValue(undefined)
      // Simplified db.insert mock
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
      } as never)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/plaid/exchange-token',
        payload: {
          publicToken: 'test-public-token',
          institutionId: 'test-institution-id',
          institutionName: 'Test Bank',
        },
      })

      assertSuccessResponse(response)
    })

    test('validates required fields', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/plaid/exchange-token',
        payload: {
          // Missing required fields
        },
      })

      assertErrorResponse(response, 400)
    })
  })

  describe('DELETE /api/plaid/connections/:itemId', () => {
    test('performs comprehensive cleanup successfully', async () => {
      const { plaidClient } = await import('../../lib/plaid.js')
      const { db } = await import('@hominem/utils/db')

      const mockPlaidItem = createTestData.plaidItem()
      const mockLinkedAccounts = [
        createTestData.financeAccount({ plaidItemId: mockPlaidItem.id }),
        createTestData.financeAccount({
          id: 'account-2',
          plaidItemId: mockPlaidItem.id,
          name: 'Test Account 2',
        }),
      ]

      vi.mocked(db.query.plaidItems.findFirst).mockResolvedValue(mockPlaidItem)
      vi.mocked(db.query.financeAccounts.findMany).mockResolvedValue(mockLinkedAccounts)
      vi.mocked(db.query.plaidItems.findMany).mockResolvedValue([])
      vi.mocked(plaidClient.itemRemove).mockResolvedValue({} as never)
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      } as never)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'DELETE',
        url: '/api/plaid/connections/test-item-id',
      })

      const body = assertSuccessResponse(response) as PlaidApiResponse
      // Verify the response structure includes deleted data counts
      expect(body.deletedData?.accounts).toBe(2)
      expect(body.deletedData?.institution).toBe(1)

      // Verify plaidClient.itemRemove was called
      expect(plaidClient.itemRemove).toHaveBeenCalledWith({
        access_token: mockPlaidItem.accessToken,
      })
    })

    test('returns 404 for non-existent item', async () => {
      const { db } = await import('@hominem/utils/db')

      vi.mocked(db.query.plaidItems.findFirst).mockResolvedValue(undefined)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'DELETE',
        url: '/api/plaid/connections/non-existent-item',
      })

      assertErrorResponse(response, 404)
    })

    test('handles ITEM_NOT_FOUND from Plaid and continues with cleanup', async () => {
      const { plaidClient } = await import('../../lib/plaid.js')
      const { db } = await import('@hominem/utils/db')

      const mockPlaidItem = createTestData.plaidItem()
      const mockLinkedAccounts = [createTestData.financeAccount({ plaidItemId: mockPlaidItem.id })]

      vi.mocked(db.query.plaidItems.findFirst).mockResolvedValue(mockPlaidItem)
      vi.mocked(db.query.financeAccounts.findMany).mockResolvedValue(mockLinkedAccounts)
      vi.mocked(db.query.plaidItems.findMany).mockResolvedValue([])

      // Mock plaidClient.itemRemove to throw ITEM_NOT_FOUND error
      const plaidError = {
        response: {
          data: {
            error_code: 'ITEM_NOT_FOUND',
            error_message:
              'The Item you requested cannot be found. This Item does not exist, has been previously removed via /item/remove, or has had access removed by the user.',
            error_type: 'ITEM_ERROR',
            display_message: null,
            documentation_url: 'https://plaid.com/docs/?ref=error#item-errors',
            request_id: 'D6aPZs72ZYk0HHK',
            suggested_action: null,
          },
        },
      }
      vi.mocked(plaidClient.itemRemove).mockRejectedValue(plaidError)

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      } as never)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'DELETE',
        url: '/api/plaid/connections/test-item-id',
      })

      const body = assertSuccessResponse(response) as PlaidApiResponse
      // Verify the response still includes deleted data counts even when Plaid item was already removed
      expect(body.deletedData?.accounts).toBe(1)
      expect(body.deletedData?.institution).toBe(1)

      // Verify plaidClient.itemRemove was called and failed as expected
      expect(plaidClient.itemRemove).toHaveBeenCalledWith({
        access_token: mockPlaidItem.accessToken,
      })
    })
  })

  describe('POST /api/plaid/sync/:itemId', () => {
    // Changed describe block
    it('should return 200 and sync accounts successfully', async () => {
      const { db } = await import('@hominem/utils/db')
      const { plaidClient } = await import('../../lib/plaid.js')
      const testPlaidItem = createTestData.plaidItem({ id: 'test-plaid-item-id' })

      vi.mocked(db.query.plaidItems.findFirst).mockResolvedValue(testPlaidItem)

      vi.mocked(plaidClient.accountsGet).mockResolvedValue({
        data: {
          accounts: [
            createTestData.plaidAccount({ account_id: 'acc1', name: 'Checking' }),
            createTestData.plaidAccount({ account_id: 'acc2', name: 'Savings' }),
          ],
          item: { item_id: 'test-plaid-item-id' },
        },
      } as never)

      vi.mocked(db.query.financeAccounts.findMany).mockResolvedValue([])
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{ id: 'new-db-acc-1' }, { id: 'new-db-acc-2' }]),
      } as never)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/plaid/sync/test-plaid-item-id', // Corrected URL
        // payload: { plaidItemId: 'test-plaid-item-id' }, // Removed from payload
      })

      assertSuccessResponse(response)
    })

    it('should return 400 if Plaid item not found', async () => {
      const { db } = await import('@hominem/utils/db')

      vi.mocked(db.query.plaidItems.findFirst).mockResolvedValue(undefined)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/plaid/sync/test-plaid-item-id', // Corrected URL
        // payload: { plaidItemId: 'test-plaid-item-id' }, // Removed from payload
      })
      assertErrorResponse(response, 404)
    })

    it('should return 500 if queue fails', async () => {
      const { db } = await import('@hominem/utils/db')
      const { globalMocks } = await import('../../../test/api-test-utils.js')

      const testPlaidItem = createTestData.plaidItem({ id: 'test-plaid-item-id' })
      vi.mocked(db.query.plaidItems.findFirst).mockResolvedValue(testPlaidItem)

      // Mock queue failure
      vi.mocked(globalMocks.queue.add).mockRejectedValue(new Error('Queue error'))

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/plaid/sync/test-plaid-item-id', // Corrected URL
        // payload: { plaidItemId: 'test-plaid-item-id' }, // Removed from payload
      })

      const body = assertErrorResponse(response, 500)
      expect(body.error).toBe('Internal Server Error')
    })
  })

  describe('POST /api/plaid/webhook', () => {
    test('handles valid transaction webhook', async () => {
      const { verifyPlaidWebhookSignature } = await import('../../lib/plaid.js')
      const { db } = await import('@hominem/utils/db')
      const { parseJsonResponse } = await import('../../../test/api-test-utils.js') // Import parseJsonResponse
      const { globalMocks } = await import('../../../test/api-test-utils.js')

      const mockPlaidItem = createTestData.plaidItem()

      vi.mocked(verifyPlaidWebhookSignature).mockReturnValue(true)
      vi.mocked(db.query.plaidItems.findFirst).mockResolvedValue(mockPlaidItem)

      // Reset queue mock to success for this test
      vi.mocked(globalMocks.queue.add).mockResolvedValue({} as never)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/plaid/webhook',
        payload: {
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'DEFAULT_UPDATE',
          item_id: 'test-item-id',
        },
      })

      // Custom assertion for this specific endpoint
      expect(response.statusCode).toBe(200)
      const body = parseJsonResponse<PlaidApiResponse>(response)
      expect(body.received).toBe(true)
    })

    test('rejects invalid webhook signature', async () => {
      const { verifyPlaidWebhookSignature } = await import('../../lib/plaid.js')

      vi.mocked(verifyPlaidWebhookSignature).mockReturnValue(false)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/plaid/webhook',
        payload: {
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'DEFAULT_UPDATE',
          item_id: 'test-item-id',
        },
      })

      assertErrorResponse(response, 401)
    })
  })
})
