import { describe, expect, it } from 'vitest';

import { calculateRunway, calculateRunwayProjection } from './runway.service';

describe('Runway Service', () => {
  describe('calculateRunway', () => {
    it('should calculate basic runway without planned purchases', () => {
      const result = calculateRunway({
        balance: 10000,
        monthlyExpenses: 2000,
      });

      expect(result.runwayMonths).toBe(4); // 10000 / 2000 = 5, but we count months where balance > 0
      expect(result.burnRate).toBe(2000);
      expect(result.initialBalance).toBe(10000);
      expect(result.isRunwayDangerous).toBe(true); // 4 months <= 6
      expect(result.totalPlannedExpenses).toBe(0);
      expect(result.monthlyBreakdown).toHaveLength(4);
    });

    it('should calculate runway with planned purchases', () => {
      const result = calculateRunway({
        balance: 10000,
        monthlyExpenses: 2000,
        plannedPurchases: [
          {
            description: 'New laptop',
            amount: 3000,
            date: new Date().toISOString(),
          },
        ],
      });

      expect(result.runwayMonths).toBe(3); // (10000 - 3000) / 2000 = 3.5, rounded down to 3
      expect(result.totalPlannedExpenses).toBe(3000);
      expect(result.isRunwayDangerous).toBe(true); // 3 months <= 6
    });

    it('should handle infinite runway when no monthly expenses', () => {
      const result = calculateRunway({
        balance: 10000,
        monthlyExpenses: 0,
      });

      expect(result.runwayMonths).toBe(121); // Safety limit + 1 (initial month)
      expect(result.isRunwayDangerous).toBe(false);
    });

    it('should handle large balance with low expenses', () => {
      const result = calculateRunway({
        balance: 100000,
        monthlyExpenses: 1000,
      });

      expect(result.runwayMonths).toBe(99); // 100000 / 1000 = 100, but we count months where balance > 0
      expect(result.isRunwayDangerous).toBe(false); // 99 months > 6
    });
  });

  describe('calculateRunwayProjection', () => {
    it('should generate 12-month projection data', () => {
      const result = calculateRunwayProjection({
        balance: 10000,
        monthlyExpenses: 2000,
      });

      expect(result).toHaveLength(12);
      expect(result[0]!.month).toBeDefined();
      expect(result[0]!.balance).toBe(8000); // 10000 - 2000
      expect(result[4]!.balance).toBe(0); // Month 5: 10000 - (5 * 2000) = 0
      expect(result[5]!.balance).toBe(-2000); // Month 6: negative balance
    });

    it('should include planned purchases in projection', () => {
      const today = new Date();
      const result = calculateRunwayProjection({
        balance: 10000,
        monthlyExpenses: 2000,
        plannedPurchases: [
          {
            description: 'New laptop',
            amount: 3000,
            date: today.toISOString(),
          },
        ],
      });

      expect(result[0]!.balance).toBe(5000); // 10000 - 2000 - 3000
    });
  });
});
