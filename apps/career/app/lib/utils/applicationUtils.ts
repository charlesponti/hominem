import { centsToDollars, formatCurrency } from '@hominem/utils/numbers';

import { StatusTone } from '~/components/patterns';

/**
 * Get a standardized company name from various company data formats
 */
export function getCompanyName(company: string | { name: string } | null | undefined): string {
  if (!company) return 'Unknown Company';
  if (typeof company === 'string') return company;
  return company.name || 'Unknown Company';
}

const APPLICATION_STATUS_TONE: Record<string, StatusTone> = {
  APPLIED: 'info',
  PHONE_SCREEN: 'warning',
  INTERVIEW: 'info',
  FINAL_INTERVIEW: 'info',
  OFFER: 'success',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
};

/**
 * Get the shared StatusBadge tone for an application status
 */
export function getApplicationStatusTone(status: string): StatusTone {
  return APPLICATION_STATUS_TONE[status] ?? 'neutral';
}

/**
 * Format a date for display in the application table
 */
export function formatApplicationDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format salary values for display
 */
export function formatApplicationSalary(salary: number | string | null | undefined): string {
  if (!salary) return '—';
  if (typeof salary === 'string') return salary;
  return formatCurrency(centsToDollars(salary));
}

/**
 * Extract unique statuses from applications array
 */
export function getUniqueStatuses(applications: Array<{ status: string }>): string[] {
  return Array.from(new Set(applications.map((app) => app.status))).sort();
}

/**
 * Extract unique sources from applications array, filtering out null/undefined values
 */
export function getUniqueSources(
  applications: Array<{ source?: string | null | undefined }>,
): string[] {
  return Array.from(
    new Set(
      applications.map((app) => app.source).filter((source): source is string => Boolean(source)),
    ),
  ).sort();
}

/**
 * Check if any filters are currently active
 */
export function hasActiveFilters(filters: {
  search?: string;
  status?: string;
  source?: string;
}): boolean {
  return !!(filters.search || filters.status || filters.source);
}


