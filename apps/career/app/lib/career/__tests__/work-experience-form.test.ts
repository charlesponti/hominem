import { describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatCurrencyInput,
  formatOptionalLabel,
  hasDefinedUpdates,
  normalizeCurrencyInput,
  normalizeMetadata,
  normalizeOptionalNumber,
  normalizeOptionalText,
  normalizePositionUpdates,
  toMonthInputValue,
} from '../work-experience-form';

describe('work-experience-form', () => {
  it('normalizes optional text', () => {
    expect(normalizeOptionalText('  hello  ')).toBe('hello');
    expect(normalizeOptionalText('   ')).toBeNull();
    expect(normalizeOptionalText(null)).toBeNull();
  });

  it('normalizes optional numbers', () => {
    expect(normalizeOptionalNumber('12')).toBe(12);
    expect(normalizeOptionalNumber('')).toBeNull();
    expect(normalizeOptionalNumber(4)).toBe(4);
  });

  it('normalizes currency dollars to cents', () => {
    expect(normalizeCurrencyInput('180000')).toBe(18_000_000);
    expect(normalizeCurrencyInput('$25,000.50')).toBe(2_500_050);
    expect(normalizeCurrencyInput('')).toBeNull();
  });

  it('formats currency for display and inputs', () => {
    expect(formatCurrency(18_000_000)).toBe('$180,000');
    expect(formatCurrencyInput(18_000_000)).toBe('180000');
    expect(formatCurrency(null)).toBeNull();
  });

  it('formats option labels', () => {
    expect(formatOptionalLabel('full-time')).toBe('Full Time');
    expect(formatOptionalLabel('better_opportunity')).toBe('Better Opportunity');
  });

  it('converts dates to month inputs in UTC', () => {
    expect(toMonthInputValue('2024-03-15T00:00:00.000Z')).toBe('2024-03');
    expect(toMonthInputValue(null)).toBe('');
  });

  it('normalizes metadata arrays and strings', () => {
    expect(
      normalizeMetadata({
        location: '  SF  ',
        achievements: ['  ship  ', '', 1, 'launch'],
        technologies: ['React', '  '],
      }),
    ).toEqual({
      location: 'SF',
      achievements: ['ship', 'launch'],
      technologies: ['React'],
    });
  });

  it('detects defined updates', () => {
    expect(hasDefinedUpdates({})).toBe(false);
    expect(hasDefinedUpdates({ role: 'Engineer' })).toBe(true);
  });

  it('normalizes work experience update payloads', () => {
    const result = normalizePositionUpdates({
      title: '  Staff Engineer  ',
      baseSalary: 20_000_000,
    });

    expect(result.title).toBe('Staff Engineer');
    expect(result.baseSalary).toBe(20_000_000);
  });
});
