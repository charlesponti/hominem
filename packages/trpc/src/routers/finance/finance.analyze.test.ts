import crypto from 'node:crypto'
import { financeTestSeed } from '@hominem/data/finance'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { useApiTestLifecycle } from '../../../../test/api-test-utils.js'
import { createTRPCTestClient } from '../../../../test/trpc-test-utils.js'

describe('Finance Analyze tRPC Router', () => {
  const { getServer } = useApiTestLifecycle()

  let testUserId: string
  let testAccountId: string
  let testInstitutionId: string
  let trpcClient: ReturnType<typeof createTRPCTestClient>

  beforeAll(async () => {
    testUserId = crypto.randomUUID()
    testAccountId = crypto.randomUUID()
    testInstitutionId = crypto.randomUUID()
    await financeTestSeed.seedFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
    })

    trpcClient = createTRPCTestClient(getServer(), testUserId)
  })

  afterAll(async () => {
    await financeTestSeed.cleanupFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
    })
  })

  describe('spendingTimeSeries', () => {
    test('should return time series data for the test user', async () => {
      const result = await trpcClient.finance.analyze.spendingTimeSeries.query({
        from: '2023-01-01',
        to: '2023-03-31',
        includeStats: true,
      })

      expect(result.data).toHaveLength(3)
      expect(result.stats).not.toBeNull()

      // Data should be ordered by date ASC (Jan, Feb, Mar)
      expect(result.data[0]).toMatchObject({
        date: '2023-01',
        income: 1000,
        expenses: 400,
        amount: -600,
        count: '3',
      })

      expect(result.data[1]).toMatchObject({
        date: '2023-02',
        income: 1200,
        expenses: 500,
        amount: -700,
        count: '3',
      })

      expect(result.data[2]).toMatchObject({
        date: '2023-03',
        income: 1100,
        expenses: 600,
        amount: -500,
        count: '3',
      })

      // Check stats
      expect(result.stats?.totalIncome).toBe(3300)
      expect(result.stats?.totalExpenses).toBe(1500)
      expect(result.stats?.total).toBe(-1800)
    })

    test('should return time series data with trend information when compareToPrevious is true', async () => {
      const result = await trpcClient.finance.analyze.spendingTimeSeries.query({
        from: '2023-01-01',
        to: '2023-03-31',
        compareToPrevious: true,
      })

      expect(result.data).toHaveLength(3)

      // January should have no trend (no previous month)
      expect(result.data[0].trend).toBeUndefined()

      // February should have trend (compared to January)
      expect(result.data[1].trend).toBeDefined()
      expect(result.data[1].trend?.direction).toBe('up') // Feb income (1200) > Jan income (1000)
      expect(result.data[1].trend?.previousAmount).toBe(1000)

      // March should have trend (compared to February)
      expect(result.data[2].trend).toBeDefined()
      expect(result.data[2].trend?.direction).toBe('down') // Mar income (1100) < Feb income (1200)
      expect(result.data[2].trend?.previousAmount).toBe(1200)
    })

    test('should filter by date range correctly', async () => {
      const result = await trpcClient.finance.analyze.spendingTimeSeries.query({
        from: '2023-02-01',
        to: '2023-03-31',
      })

      expect(result.data).toHaveLength(2)
      expect(result.data[0].date).toBe('2023-02')
      expect(result.data[1].date).toBe('2023-03')

      // Should not include January data
      expect(result.data.find((d) => d.date === '2023-01')).toBeUndefined()
    })

    test('should handle empty results for period with no data', async () => {
      const result = await trpcClient.finance.analyze.spendingTimeSeries.query({
        from: '2024-01-01',
        to: '2024-03-31',
      })

      expect(result.data).toHaveLength(0)
      expect(result.stats).toBeNull()
    })

    test('should handle different groupBy options', async () => {
      const result = await trpcClient.finance.analyze.spendingTimeSeries.query({
        groupBy: 'week',
      })

      expect(result.query.groupBy).toBe('week')
      // The actual grouping behavior depends on the implementation
      // This test ensures the parameter is passed through correctly
    })
  })

  describe('topMerchants', () => {
    test('should return top merchants for the test user', async () => {
      const result = await trpcClient.finance.analyze.topMerchants.query({
        from: '2023-01-01',
        to: '2023-03-31',
        limit: 5,
      })

      expect(Array.isArray(result)).toBe(true)
      // Add more specific assertions based on your test data
    })
  })

  describe('categoryBreakdown', () => {
    test('should return category breakdown for the test user', async () => {
      const result = await trpcClient.finance.analyze.categoryBreakdown.query({
        from: '2023-01-01',
        to: '2023-03-31',
        limit: '10',
      })

      expect(Array.isArray(result)).toBe(true)
      // Add more specific assertions based on your test data
    })
  })

  describe('monthlyStats', () => {
    test('should return monthly stats for a specific month', async () => {
      const result = await trpcClient.finance.analyze.monthlyStats.query({
        month: '2023-01',
      })

      expect(result).toMatchObject({
        month: '2023-01',
        totalIncome: expect.any(Number),
        totalExpenses: expect.any(Number),
        netIncome: expect.any(Number),
        transactionCount: expect.any(Number),
        categorySpending: expect.any(Array),
      })
    })
  })
})
