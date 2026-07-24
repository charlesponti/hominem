import { describe, expect, it } from 'vitest';

import {
  formatApplicationDate,
  formatApplicationSalary,
  getApplicationStatusTone,
  getCompanyName,
  getUniqueSources,
  getUniqueStatuses,
  hasActiveFilters,
} from '../applicationUtils';

describe('Application Utils', () => {
  describe('getCompanyName', () => {
    it('should return "Unknown Company" for null/undefined input', () => {
      expect(getCompanyName(null)).toBe('Unknown Company');
      expect(getCompanyName(undefined)).toBe('Unknown Company');
    });

    it('should return the string directly if company is a string', () => {
      expect(getCompanyName('Google')).toBe('Google');
      expect(getCompanyName('Microsoft Corporation')).toBe('Microsoft Corporation');
    });

    it('should return company.name if company is an object with name property', () => {
      expect(getCompanyName({ name: 'Apple Inc.' })).toBe('Apple Inc.');
    });

    it('should return "Unknown Company" if company object has no name or empty name', () => {
      expect(getCompanyName({ name: '' })).toBe('Unknown Company');
      expect(getCompanyName({} as { name: string })).toBe('Unknown Company');
    });
  });

  describe('getApplicationStatusTone', () => {
    it('should return correct tones for known statuses', () => {
      expect(getApplicationStatusTone('APPLIED')).toBe('info');
      expect(getApplicationStatusTone('PHONE_SCREEN')).toBe('warning');
      expect(getApplicationStatusTone('INTERVIEW')).toBe('info');
      expect(getApplicationStatusTone('FINAL_INTERVIEW')).toBe('info');
      expect(getApplicationStatusTone('OFFER')).toBe('success');
      expect(getApplicationStatusTone('ACCEPTED')).toBe('success');
      expect(getApplicationStatusTone('REJECTED')).toBe('danger');
      expect(getApplicationStatusTone('WITHDRAWN')).toBe('neutral');
    });

    it('should return the neutral tone for unknown statuses', () => {
      expect(getApplicationStatusTone('UNKNOWN_STATUS')).toBe('neutral');
      expect(getApplicationStatusTone('')).toBe('neutral');
    });
  });

  describe('formatApplicationDate', () => {
    it('should return "—" for null/undefined dates', () => {
      expect(formatApplicationDate(null)).toBe('—');
      expect(formatApplicationDate(undefined)).toBe('—');
    });

    it('should format Date objects correctly', () => {
      const date = new Date('2024-03-15');
      const result = formatApplicationDate(date);
      expect(result).toMatch(/^[A-Za-z]{3} \d{1,2}, \d{4}$/); // Format: "Mar 15, 2024"
    });

    it('should format date strings correctly', () => {
      const result = formatApplicationDate('2024-03-15');
      expect(result).toMatch(/^[A-Za-z]{3} \d{1,2}, \d{4}$/);
    });

    it('should handle ISO date strings', () => {
      const result = formatApplicationDate('2024-03-15T10:30:00Z');
      expect(result).toMatch(/^[A-Za-z]{3} \d{1,2}, \d{4}$/);
    });
  });

  describe('formatApplicationSalary', () => {
    it('should return "—" for null/undefined/empty values', () => {
      expect(formatApplicationSalary(null)).toBe('—');
      expect(formatApplicationSalary(undefined)).toBe('—');
      expect(formatApplicationSalary(0)).toBe('—');
    });

    it('should return string values as-is', () => {
      expect(formatApplicationSalary('$120,000 - $150,000')).toBe('$120,000 - $150,000');
      expect(formatApplicationSalary('Negotiable')).toBe('Negotiable');
    });

    it('should format numeric values using currency formatting', () => {
      expect(formatApplicationSalary(12000000)).toBe('$120,000'); // 120k in cents
    });
  });

  describe('getUniqueStatuses', () => {
    it('should return unique statuses sorted alphabetically', () => {
      const applications = [
        { status: 'APPLIED' },
        { status: 'INTERVIEW' },
        { status: 'APPLIED' },
        { status: 'OFFER' },
        { status: 'INTERVIEW' },
      ];

      const result = getUniqueStatuses(applications);
      expect(result).toEqual(['APPLIED', 'INTERVIEW', 'OFFER']);
    });

    it('should handle empty array', () => {
      expect(getUniqueStatuses([])).toEqual([]);
    });

    it('should handle single status', () => {
      const applications = [{ status: 'APPLIED' }];
      expect(getUniqueStatuses(applications)).toEqual(['APPLIED']);
    });
  });

  describe('getUniqueSources', () => {
    it('should return unique sources, filtered and sorted', () => {
      const applications = [
        { source: 'LinkedIn' },
        { source: 'Indeed' },
        { source: null },
        { source: 'LinkedIn' },
        { source: undefined },
        { source: 'Company Website' },
      ];

      const result = getUniqueSources(applications);
      expect(result).toEqual(['Company Website', 'Indeed', 'LinkedIn']);
    });

    it('should handle empty array', () => {
      expect(getUniqueSources([])).toEqual([]);
    });

    it('should filter out null and undefined values', () => {
      const applications = [{ source: null }, { source: undefined }];
      expect(getUniqueSources(applications)).toEqual([]);
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false when no filters are active', () => {
      expect(hasActiveFilters({})).toBe(false);
      expect(hasActiveFilters({ search: '', statuses: [], source: undefined })).toBe(false);
    });

    it('should return true when search filter is active', () => {
      expect(hasActiveFilters({ search: 'engineer' })).toBe(true);
    });

    it('should return true when status filters are active', () => {
      expect(hasActiveFilters({ statuses: ['APPLIED'] })).toBe(true);
      expect(hasActiveFilters({ statuses: ['APPLIED', 'INTERVIEW'] })).toBe(true);
    });

    it('should return true when source filter is active', () => {
      expect(hasActiveFilters({ source: 'LinkedIn' })).toBe(true);
    });

    it('should return true when multiple filters are active', () => {
      expect(
        hasActiveFilters({
          search: 'engineer',
          statuses: ['APPLIED'],
          source: 'LinkedIn',
        }),
      ).toBe(true);
    });
  });
});
