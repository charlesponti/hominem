import { describe, expect, it } from 'vitest';

import { formatMonthYear } from './dates';

describe('formatMonthYear', () => {
  it('formats month correctly for the current year', () => {
    const currentYear = new Date().getFullYear();
    const result = formatMonthYear(`${currentYear}-01`);
    expect(result).toBe('Jan');
  });

  it('formats month and year correctly for past years', () => {
    const result = formatMonthYear('2023-12');
    expect(result).toBe('Dec 23');
  });

  it('handles invalid input strings', () => {
    expect(formatMonthYear('')).toBe('');
    expect(formatMonthYear('2024')).toBe('');
    expect(formatMonthYear('invalid-format')).toBe('');
  });

  it('handles boundaries like December', () => {
    const currentYear = new Date().getFullYear();
    expect(formatMonthYear(`${currentYear}-12`)).toBe('Dec');
  });

  it('handles boundaries like January', () => {
    const lastYear = new Date().getFullYear() - 1;
    const result = formatMonthYear(`${lastYear}-01`);
    expect(result).toMatch(/Jan \d{2}/);
  });
});
