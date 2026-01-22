import { describe, expect, it } from 'vitest'
import { calculateRunway } from './runway.service'

describe('Runway Service', () => {
  describe('calculateRunway', () => {
    it('should calculate basic runway without planned purchases', () => {
      const result = calculateRunway({
        balance: 10000,
        monthlyExpenses: 2000,
      })

      // 10000 / 2000 = 5 months.
      // In the loop:
      // i=0: 10000 - 2000 = 8000 (runwayMonths=1)
      // i=1: 8000 - 2000 = 6000 (runwayMonths=2)
      // i=2: 6000 - 2000 = 4000 (runwayMonths=3)
      // i=3: 4000 - 2000 = 2000 (runwayMonths=4)
      // i=4: 2000 - 2000 = 0 (runwayMonths=4 - loop tracks months where balance > 0)
      expect(result.runwayMonths).toBe(4)
      expect(result.burnRate).toBe(2000)
      expect(result.initialBalance).toBe(10000)
      expect(result.isRunwayDangerous).toBe(true) // 4 months <= 6
      expect(result.totalPlannedExpenses).toBe(0)
      expect(result.monthlyBreakdown).toHaveLength(5) // Includes the month it hits 0
    })

    it('should calculate runway with planned purchases', () => {
      const today = new Date()
      const result = calculateRunway({
        balance: 10000,
        monthlyExpenses: 2000,
        plannedPurchases: [
          {
            description: 'New laptop',
            amount: 3000,
            date: today.toISOString(),
          },
        ],
      })

      // Month 1: 10000 - 2000 - 3000 = 5000 (runwayMonths=1)
      // Month 2: 5000 - 2000 = 3000 (runwayMonths=2)
      // Month 3: 3000 - 2000 = 1000 (runwayMonths=3)
      // Month 4: 1000 - 2000 = -1000 (runwayMonths=3)
      expect(result.runwayMonths).toBe(3)
      expect(result.totalPlannedExpenses).toBe(3000)
      expect(result.projectionData[0]!.balance).toBe(5000)
    })

    it('should handle infinite runway when no monthly expenses', () => {
      const result = calculateRunway({
        balance: 10000,
        monthlyExpenses: 0,
      })

      expect(result.runwayMonths).toBe(Number.POSITIVE_INFINITY)
      expect(result.isRunwayDangerous).toBe(false)
    })

    it('should generate projection data for the specified window', () => {
      const result = calculateRunway({
        balance: 10000,
        monthlyExpenses: 1000,
        projectionMonths: 6,
      })

      expect(result.projectionData).toHaveLength(6)
      expect(result.projectionData[0]!.balance).toBe(9000)
      expect(result.projectionData[5]!.balance).toBe(4000)
    })

    it('should handle zero balance correctly', () => {
      const result = calculateRunway({
        balance: 0,
        monthlyExpenses: 1000,
      })

      expect(result.runwayMonths).toBe(0)
      expect(result.isRunwayDangerous).toBe(true)
      expect(result.projectionData[0]!.balance).toBe(-1000)
    })

    it('should calculate correct minimum balance', () => {
      const today = new Date()
      const nextMonth = new Date(today)
      nextMonth.setMonth(today.getMonth() + 1)

      const result = calculateRunway({
        balance: 5000,
        monthlyExpenses: 1000,
        plannedPurchases: [
          {
            description: 'Expensive repair',
            amount: 6000,
            date: nextMonth.toISOString(),
          },
        ],
        projectionMonths: 3,
      })

      // Month 1: 5000 - 1000 = 4000
      // Month 2: 4000 - 1000 - 6000 = -3000
      // Month 3: -3000 - 1000 = -4000
      expect(result.minimumBalance).toBe(-4000)
    })
  })
})
