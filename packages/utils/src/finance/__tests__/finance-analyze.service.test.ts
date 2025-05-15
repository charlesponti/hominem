import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculateTimeSeriesStats,
  generateTimeSeriesData,
  type TimeSeriesDataPoint,
} from '../finance-analyze.service.js'
import { summarizeByMonth } from '../finance.service.js'

// Mock the finance service
vi.mock('../finance.service.js', () => ({
  summarizeByMonth: vi.fn(),
}))

describe('Finance Analyze Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateTimeSeriesStats', () => {
    it('should calculate correct statistics for time series data', () => {
      // Arrange
      const timeSeriesData: TimeSeriesDataPoint[] = [
        {
          date: '2023-03',
          amount: 500,
          count: 10,
          average: 50,
          income: 800,
          expenses: 300,
          formattedAmount: '$500.00',
          formattedIncome: '$800.00',
          formattedExpenses: '$300.00',
        },
        {
          date: '2023-02',
          amount: 300,
          count: 6,
          average: 50,
          income: 600,
          expenses: 300,
          formattedAmount: '$300.00',
          formattedIncome: '$600.00',
          formattedExpenses: '$300.00',
        },
        {
          date: '2023-01',
          amount: 200,
          count: 4,
          average: 50,
          income: 500,
          expenses: 300,
          formattedAmount: '$200.00',
          formattedIncome: '$500.00',
          formattedExpenses: '$300.00',
        },
      ]

      // Act
      const stats = calculateTimeSeriesStats(timeSeriesData)

      // Assert
      expect(stats).toEqual({
        total: 1000,
        average: 1000 / 3,
        median: 300,
        min: 200,
        max: 500,
        count: 3,
        formattedTotal: '$1,000.00',
        totalIncome: 1900,
        averageIncome: 1900 / 3,
        medianIncome: 600,
        minIncome: 500,
        maxIncome: 800,
        formattedTotalIncome: '$1,900.00',
        totalExpenses: 900,
        averageExpenses: 900 / 3,
        medianExpenses: 300,
        minExpenses: 300,
        maxExpenses: 300,
        formattedTotalExpenses: '$900.00',
        periodCovered: '2023-01 to 2023-03',
      })
    })

    it('should handle single item array', () => {
      // Arrange
      const timeSeriesData: TimeSeriesDataPoint[] = [
        {
          date: '2023-01',
          amount: 200,
          count: 4,
          average: 50,
          income: 500,
          expenses: 300,
          formattedAmount: '$200.00',
          formattedIncome: '$500.00',
          formattedExpenses: '$300.00',
        },
      ]

      // Act
      const stats = calculateTimeSeriesStats(timeSeriesData)

      // Assert
      expect(stats).toEqual({
        total: 200,
        average: 200,
        median: 200,
        min: 200,
        max: 200,
        count: 1,
        formattedTotal: '$200.00',
        totalIncome: 500,
        averageIncome: 500,
        medianIncome: 500,
        minIncome: 500,
        maxIncome: 500,
        formattedTotalIncome: '$500.00',
        totalExpenses: 300,
        averageExpenses: 300,
        medianExpenses: 300,
        minExpenses: 300,
        maxExpenses: 300,
        formattedTotalExpenses: '$300.00',
        periodCovered: '2023-01 to 2023-01',
      })
    })
  })

  describe('generateTimeSeriesData', () => {
    it('should transform monthly summaries into time series data', async () => {
      // Arrange
      const mockMonthlySummaries = [
        {
          month: '2023-03',
          count: 10,
          total: '500.00',
          average: '50.00',
          income: '800.00',
          expenses: '-300.00',
        },
        {
          month: '2023-02',
          count: 6,
          total: '300.00',
          average: '50.00',
          income: '600.00',
          expenses: '-300.00',
        },
        {
          month: '2023-01',
          count: 4,
          total: '200.00',
          average: '50.00',
          income: '500.00',
          expenses: '-300.00',
        },
      ]

      vi.mocked(summarizeByMonth).mockResolvedValue(mockMonthlySummaries)

      const options = {
        from: '2023-01-01',
        to: '2023-03-31',
        includeStats: true,
        userId: 'test-user',
      }

      // Act
      const result = await generateTimeSeriesData(options)

      // Assert
      expect(summarizeByMonth).toHaveBeenCalledWith(options)
      expect(result.data).toHaveLength(3)
      expect(result.data[0].date).toBe('2023-03')
      expect(result.data[0].amount).toBe(500)
      expect(result.data[0].income).toBe(800)
      expect(result.data[0].expenses).toBe(-300)
      expect(result.stats).not.toBeNull()
      expect(result.stats?.total).toBe(1000)
      expect(result.stats?.totalIncome).toBe(1900)
      expect(result.stats?.totalExpenses).toBe(-900)
      expect(result.query).toEqual({
        from: '2023-01-01',
        to: '2023-03-31',
        account: undefined,
        category: undefined,
        limit: undefined,
        groupBy: 'month',
      })
    })

    it('should add trend data when compareToPrevious is true', async () => {
      // Arrange
      const mockMonthlySummaries = [
        {
          month: '2023-03',
          count: 10,
          total: '500.00',
          average: '50.00',
          income: '800.00',
          expenses: '-300.00',
        },
        {
          month: '2023-02',
          count: 6,
          total: '300.00',
          average: '50.00',
          income: '600.00',
          expenses: '-300.00',
        },
        {
          month: '2023-01',
          count: 4,
          total: '200.00',
          average: '50.00',
          income: '500.00',
          expenses: '-300.00',
        },
      ]

      vi.mocked(summarizeByMonth).mockResolvedValue(mockMonthlySummaries)

      const options = {
        compareToPrevious: true,
        userId: 'test-user',
      }

      // Act
      const result = await generateTimeSeriesData(options)

      // Assert
      expect(result.data[0].trend).toBeDefined()
      expect(result.data[0].trend?.direction).toBe('up')
      expect(result.data[0].trend?.previousAmount).toBe(600)
      expect(result.data[2].trend).toBeUndefined()
      // Stats should be null when includeStats is not provided
      expect(result.stats).toBeNull()
      // Should call summarizeByMonth with the same options
      expect(summarizeByMonth).toHaveBeenCalledWith(options)
    })

    it('should not include stats when includeStats is false', async () => {
      // Arrange
      const mockMonthlySummaries = [
        {
          month: '2023-03',
          count: 10,
          total: '500.00',
          average: '50.00',
          income: '800.00',
          expenses: '-300.00',
        },
      ]

      vi.mocked(summarizeByMonth).mockResolvedValue(mockMonthlySummaries)

      const options = {
        includeStats: false,
        userId: 'test-user',
      }

      // Act
      const result = await generateTimeSeriesData(options)

      // Assert
      expect(result.stats).toBeNull()
    })

    it('should use provided groupBy in query', async () => {
      // Arrange: minimal summary data
      const mockMonthlySummaries = [
        {
          month: '2023-01',
          count: 1,
          total: '100.00',
          average: '100.00',
          income: '100.00',
          expenses: '0.00',
        },
      ]
      vi.mocked(summarizeByMonth).mockResolvedValue(mockMonthlySummaries)

      const options = {
        from: '2023-01-01',
        to: '2023-01-31',
        groupBy: 'week' as const,
        userId: 'test-user',
        includeStats: false,
      }

      // Act
      const result = await generateTimeSeriesData(options)

      // Assert
      expect(summarizeByMonth).toHaveBeenCalledWith(options)
      expect(result.query.groupBy).toBe('week')
      expect(result.stats).toBeNull()
    })
  })
})
