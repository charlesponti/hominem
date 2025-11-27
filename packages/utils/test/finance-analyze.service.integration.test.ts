import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  calculateTimeSeriesStats,
  generateTimeSeriesData,
  type TimeSeriesDataPoint,
} from '../src/finance/analytics/time-series.service'
import { cleanupFinanceTestData, seedFinanceTestData } from './finance-test-seed'

describe.skip('Finance Analyze Service Integration Tests', () => {
  let testUserId: string
  let testAccountId: string
  let testInstitutionId: string

  // Create test data before each test
  beforeEach(async () => {
    testUserId = crypto.randomUUID()
    testAccountId = crypto.randomUUID()
    testInstitutionId = crypto.randomUUID()
    await seedFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
    })
  })

  // Clean up test data after each test
  afterEach(async () => {
    await cleanupFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
    })
  })

  describe('generateTimeSeriesData', () => {
    it('should generate correct time series data from real database queries', async () => {
      // Act
      const result = await generateTimeSeriesData({
        userId: testUserId,
        from: '2023-01-01',
        to: '2023-03-31',
        includeStats: true,
      })

      // Assert
      expect(result.data).toHaveLength(3)

      // Data is ordered by date ASC, so January (2023-01) comes first
      // January 2023: Income 1000, Expenses 400 (300+100), Net -600 (expenses - income)
      expect(result.data[0]).toMatchObject({
        date: '2023-01',
        income: 1000,
        expenses: 400,
        amount: -600, // expenses - income (400 - 1000)
        count: '3', // count comes back as string from SQL
      })

      // February 2023: Income 1200, Expenses 500 (350+150), Net -700
      expect(result.data[1]).toMatchObject({
        date: '2023-02',
        income: 1200,
        expenses: 500,
        amount: -700, // expenses - income (500 - 1200)
        count: '3', // count comes back as string from SQL
      })

      // March 2023: Income 1100, Expenses 600 (400+200), Net -500
      expect(result.data[2]).toMatchObject({
        date: '2023-03',
        income: 1100,
        expenses: 600,
        amount: -500,
        count: '3',
      })

      // Check stats
      expect(result.stats).not.toBeNull()
      expect(result.stats?.totalIncome).toBe(3300) // 1000 + 1200 + 1100
      expect(result.stats?.totalExpenses).toBe(1500) // 400 + 500 + 600
      expect(result.stats?.total).toBe(-1800) // -600 + -700 + -500
    })

    it('should calculate trend data correctly when compareToPrevious is true', async () => {
      // Act
      const result = await generateTimeSeriesData({
        userId: testUserId,
        from: '2023-01-01',
        to: '2023-03-31',
        compareToPrevious: true,
      })

      // Assert
      expect(result.data[0].trend).toBeUndefined() // January has no previous month
      expect(result.data[1].trend).toBeDefined() // February has trend (compared to January)
      expect(result.data[2].trend).toBeDefined() // March has trend (compared to February)

      // February vs January trend
      const febTrend = result.data[1].trend
      expect(febTrend).toBeDefined()
      if (febTrend) {
        expect(febTrend.direction).toBe('up') // Feb income (1200) > Jan income (1000)
        expect(febTrend.previousAmount).toBe(1000) // Jan income
        expect(febTrend.directionExpenses).toBe('up') // Feb expenses (500) > Jan expenses (400)
        expect(febTrend.previousExpenses).toBe(400) // Jan expenses
      }

      // March vs February trend
      const marTrend = result.data[2].trend
      expect(marTrend).toBeDefined()
      if (marTrend) {
        expect(marTrend.direction).toBe('down') // Mar income (1100) < Feb income (1200)
        expect(marTrend.previousAmount).toBe(1200) // Feb income
        expect(marTrend.directionExpenses).toBe('up') // Mar expenses (600) > Feb expenses (500)
        expect(marTrend.previousExpenses).toBe(500) // Feb expenses
      }
    })

    it('should handle filtering by date range correctly', async () => {
      // Act - Only query February and March
      const result = await generateTimeSeriesData({
        userId: testUserId,
        from: '2023-02-01',
        to: '2023-03-31',
        includeStats: true,
      })

      // Assert
      expect(result.data).toHaveLength(2)
      expect(result.data[0].date).toBe('2023-02') // February comes first (ASC order)
      expect(result.data[1].date).toBe('2023-03') // March comes second

      // Should not include January data
      expect(result.data.find((d) => d.date === '2023-01')).toBeUndefined()
    })

    it('should handle empty results gracefully', async () => {
      // Act - Query for a period with no data
      const result = await generateTimeSeriesData({
        userId: testUserId,
        from: '2024-01-01',
        to: '2024-03-31',
        includeStats: true,
      })

      // Assert
      expect(result.data).toHaveLength(0)
      expect(result.stats).toBeNull()
    })

    it('should respect groupBy parameter', async () => {
      // Act - Test with week grouping (though we only have monthly data)
      const result = await generateTimeSeriesData({
        userId: testUserId,
        from: '2023-01-01',
        to: '2023-03-31',
        groupBy: 'week',
        includeStats: false,
      })

      // Assert
      expect(result.query.groupBy).toBe('week')
      // The actual grouping behavior would depend on the summarizeByMonth implementation
      // This test ensures the parameter is passed through correctly
    })
  })

  describe('calculateTimeSeriesStats', () => {
    it('should calculate correct statistics for real time series data', () => {
      // Arrange - Create realistic time series data
      const timeSeriesData: TimeSeriesDataPoint[] = [
        {
          date: '2023-03',
          amount: 500, // Net: 1100 - 600
          count: 2,
          average: 550,
          income: 1100,
          expenses: 600,
          formattedAmount: '$500.00',
          formattedIncome: '$1,100.00',
          formattedExpenses: '$600.00',
        },
        {
          date: '2023-02',
          amount: 700, // Net: 1200 - 500
          count: 2,
          average: 600,
          income: 1200,
          expenses: 500,
          formattedAmount: '$700.00',
          formattedIncome: '$1,200.00',
          formattedExpenses: '$500.00',
        },
        {
          date: '2023-01',
          amount: 600, // Net: 1000 - 400
          count: 3,
          average: 333.33,
          income: 1000,
          expenses: 400,
          formattedAmount: '$600.00',
          formattedIncome: '$1,000.00',
          formattedExpenses: '$400.00',
        },
      ]

      // Act
      const stats = calculateTimeSeriesStats(timeSeriesData)

      // Assert
      expect(stats).toEqual({
        total: 1800, // 500 + 700 + 600
        average: 600, // 1800 / 3
        median: 600,
        min: 500,
        max: 700,
        count: 3,
        formattedTotal: '$1,800.00',
        totalIncome: 3300, // 1100 + 1200 + 1000
        averageIncome: 1100, // 3300 / 3
        medianIncome: 1100,
        minIncome: 1000,
        maxIncome: 1200,
        formattedTotalIncome: '$3,300.00',
        totalExpenses: 1500, // 600 + 500 + 400
        averageExpenses: 500, // 1500 / 3
        medianExpenses: 500,
        minExpenses: 400,
        maxExpenses: 600,
        formattedTotalExpenses: '$1,500.00',
        periodCovered: '2023-01 to 2023-03',
      })
    })
  })
})
