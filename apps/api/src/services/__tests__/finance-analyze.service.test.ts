import { summarizeByMonth } from '@hominem/utils/finance'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculateTimeSeriesStats,
  generateTimeSeriesData,
  type TimeSeriesDataPoint,
} from '../finance-analyze.service'

// Mock the finance service
vi.mock('@hominem/utils/finance', () => ({
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
        { date: '2023-03', amount: 500, count: 10, average: 50, formattedAmount: '$500.00' },
        { date: '2023-02', amount: 300, count: 6, average: 50, formattedAmount: '$300.00' },
        { date: '2023-01', amount: 200, count: 4, average: 50, formattedAmount: '$200.00' },
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
        periodCovered: '2023-01 to 2023-03',
      })
    })

    it('should handle single item array', () => {
      // Arrange
      const timeSeriesData: TimeSeriesDataPoint[] = [
        { date: '2023-01', amount: 200, count: 4, average: 50, formattedAmount: '$200.00' },
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
        periodCovered: '2023-01 to 2023-01',
      })
    })
  })

  describe('generateTimeSeriesData', () => {
    it('should transform monthly summaries into time series data', async () => {
      // Arrange
      const mockMonthlySummaries = [
        { month: '2023-03', count: 10, total: '500.00', average: '50.00' },
        { month: '2023-02', count: 6, total: '300.00', average: '50.00' },
        { month: '2023-01', count: 4, total: '200.00', average: '50.00' },
      ]

      vi.mocked(summarizeByMonth).mockResolvedValue(mockMonthlySummaries)

      const options = {
        from: '2023-01-01',
        to: '2023-03-31',
        includeStats: true,
      }

      // Act
      const result = await generateTimeSeriesData(options)

      // Assert
      expect(summarizeByMonth).toHaveBeenCalledWith(options)
      expect(result.data).toHaveLength(3)
      expect(result.data[0].date).toBe('2023-03')
      expect(result.data[0].amount).toBe(500)
      expect(result.stats).not.toBeNull()
      expect(result.stats?.total).toBe(1000)
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
        { month: '2023-03', count: 10, total: '500.00', average: '50.00' },
        { month: '2023-02', count: 6, total: '300.00', average: '50.00' },
        { month: '2023-01', count: 4, total: '200.00', average: '50.00' },
      ]

      vi.mocked(summarizeByMonth).mockResolvedValue(mockMonthlySummaries)

      const options = {
        compareToPrevious: true,
      }

      // Act
      const result = await generateTimeSeriesData(options)

      // Assert
      expect(result.data[0].trend).toBeDefined()
      expect(result.data[0].trend?.direction).toBe('up')
      expect(result.data[0].trend?.previousAmount).toBe(300)
      expect(result.data[2].trend).toBeUndefined() // Last item has no previous
    })

    it('should not include stats when includeStats is false', async () => {
      // Arrange
      const mockMonthlySummaries = [
        { month: '2023-03', count: 10, total: '500.00', average: '50.00' },
      ]

      vi.mocked(summarizeByMonth).mockResolvedValue(mockMonthlySummaries)

      const options = {
        includeStats: false,
      }

      // Act
      const result = await generateTimeSeriesData(options)

      // Assert
      expect(result.stats).toBeNull()
    })
  })
})
