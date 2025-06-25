import { financeTestSeed } from '@hominem/utils/finance'
import crypto from 'node:crypto'
import { describe, expect, test } from 'vitest'
import {
  assertErrorResponse,
  assertSuccessResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '../../../test/api-test-utils.js'

interface TimeSeriesResponse {
  data: Array<{
    date: string
    income: number
    expenses: number
    amount: number
    count: string
    trend?: {
      direction: 'up' | 'down'
      previousAmount: number
    }
  }>
  stats?: {
    totalIncome: number
    totalExpenses: number
    total: number
  } | null
  query: Record<string, unknown>
}

describe('Finance Analyze Routes', () => {
  const { getServer } = useApiTestLifecycle()

  let testUserId: string
  let testAccountId: string
  let testInstitutionId: string

  beforeAll(async () => {
    testUserId = crypto.randomUUID()
    testAccountId = crypto.randomUUID()
    testInstitutionId = crypto.randomUUID()
    await financeTestSeed.seedFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
    })
  })

  afterAll(async () => {
    await financeTestSeed.cleanupFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
    })
  })

  describe('GET /api/finance/analyze/spending-time-series', () => {
    test('should return time series data for the test user', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/analyze/spending-time-series?from=2023-01-01&to=2023-03-31&includeStats=true',
        headers: {
          'x-user-id': testUserId,
        },
      })

      const body = await assertSuccessResponse<TimeSeriesResponse>(response)

      expect(body.data).toHaveLength(3)
      expect(body.stats).not.toBeNull()

      // Data should be ordered by date ASC (Jan, Feb, Mar)
      expect(body.data[0]).toMatchObject({
        date: '2023-01',
        income: 1000,
        expenses: 400,
        amount: -600,
        count: '3',
      })

      expect(body.data[1]).toMatchObject({
        date: '2023-02',
        income: 1200,
        expenses: 500,
        amount: -700,
        count: '3',
      })

      expect(body.data[2]).toMatchObject({
        date: '2023-03',
        income: 1100,
        expenses: 600,
        amount: -500,
        count: '3',
      })

      // Check stats
      expect(body.stats?.totalIncome).toBe(3300)
      expect(body.stats?.totalExpenses).toBe(1500)
      expect(body.stats?.total).toBe(-1800)
    })

    test('should return time series data with trend information when compareToPrevious is true', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/analyze/spending-time-series?from=2023-01-01&to=2023-03-31&compareToPrevious=true',
        headers: {
          'x-user-id': testUserId,
        },
      })

      const body = await assertSuccessResponse<TimeSeriesResponse>(response)

      expect(body.data).toHaveLength(3)

      // January should have no trend (no previous month)
      expect(body.data[0].trend).toBeUndefined()

      // February should have trend (compared to January)
      expect(body.data[1].trend).toBeDefined()
      expect(body.data[1].trend?.direction).toBe('up') // Feb income (1200) > Jan income (1000)
      expect(body.data[1].trend?.previousAmount).toBe(1000)

      // March should have trend (compared to February)
      expect(body.data[2].trend).toBeDefined()
      expect(body.data[2].trend?.direction).toBe('down') // Mar income (1100) < Feb income (1200)
      expect(body.data[2].trend?.previousAmount).toBe(1200)
    })

    test('should filter by date range correctly', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/analyze/spending-time-series?from=2023-02-01&to=2023-03-31',
        headers: {
          'x-user-id': testUserId,
        },
      })

      const body = await assertSuccessResponse<TimeSeriesResponse>(response)

      expect(body.data).toHaveLength(2)
      expect(body.data[0].date).toBe('2023-02')
      expect(body.data[1].date).toBe('2023-03')

      // Should not include January data
      expect(body.data.find((d) => d.date === '2023-01')).toBeUndefined()
    })

    test('should handle empty results for period with no data', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/analyze/spending-time-series?from=2024-01-01&to=2024-03-31',
        headers: {
          'x-user-id': testUserId,
        },
      })

      const body = await assertSuccessResponse<TimeSeriesResponse>(response)

      expect(body.data).toHaveLength(0)
      expect(body.stats).toBeNull()
    })

    test('should return 401 when user is not authenticated', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/analyze/spending-time-series',
        headers: {
          'x-user-id': null,
        },
      })

      await assertErrorResponse(response, 401)
    })

    test('should handle different groupBy options', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/analyze/spending-time-series?groupBy=week',
        headers: {
          'x-user-id': testUserId,
        },
      })

      const body = await assertSuccessResponse<TimeSeriesResponse>(response)

      expect(body.query.groupBy).toBe('week')
      // The actual grouping behavior depends on the implementation
      // This test ensures the parameter is passed through correctly
    })
  })
})
