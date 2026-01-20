import { describe, it, expect } from 'vitest';

import { calculateAveragePerDay, calculateTimeSeriesTotals } from './analytics.utils';

describe('analytics.utils', () => {
  describe('calculateAveragePerDay', () => {
    it('should return 0 for 0 spending', () => {
      const result = calculateAveragePerDay(0, '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z');
      expect(result).toBe(0);
    });

    it('should use default 30 days when no dates provided', () => {
      const result = calculateAveragePerDay(300, undefined, undefined);
      expect(result).toBe(10);
    });

    it('should calculate correctly with provided date range', () => {
      const result = calculateAveragePerDay(1000, '2024-01-01T00:00:00Z', '2024-01-11T00:00:00Z');
      expect(result).toBeCloseTo(100, 0);
    });

    it('should handle single day correctly', () => {
      const result = calculateAveragePerDay(100, '2024-01-01T00:00:00Z', '2024-01-01T23:59:59Z');
      expect(result).toBeCloseTo(100, 0);
    });

    it('should handle different date formats', () => {
      const result = calculateAveragePerDay(600, '2024-01-01', '2024-01-11');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateTimeSeriesTotals', () => {
    it('should return zero for empty series', () => {
      const result = calculateTimeSeriesTotals([]);
      expect(result).toEqual({ total: 0, average: 0 });
    });

    it('should sum income and expenses correctly', () => {
      const series = [
        { income: '1000', expenses: '500' },
        { income: '1000', expenses: '500' },
      ];
      const result = calculateTimeSeriesTotals(series);
      expect(result.total).toBe(3000);
      expect(result.average).toBe(1500);
    });

    it('should handle single period', () => {
      const series = [{ income: '2000', expenses: '800' }];
      const result = calculateTimeSeriesTotals(series);
      expect(result.total).toBe(2800);
      expect(result.average).toBe(2800);
    });

    it('should handle string number parsing', () => {
      const series = [
        { income: '1500.50', expenses: '750.25' },
        { income: '1200.75', expenses: '600.50' },
      ];
      const result = calculateTimeSeriesTotals(series);
      expect(result.total).toBeCloseTo(4051.5, 1);
    });

    it('should handle missing or zero values', () => {
      const series = [
        { income: '0', expenses: '500' },
        { income: '1000', expenses: '0' },
      ];
      const result = calculateTimeSeriesTotals(series);
      expect(result.total).toBe(1500);
      expect(result.average).toBe(750);
    });
  });
});
