import type { CareerPositionRecord } from '@hominem/db';
import { humanizeIdentifier } from '@hominem/utils/text';

export const EMPLOYMENT_TYPE_OPTIONS = [
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
  'temporary',
] as const;

export const WORK_ARRANGEMENT_OPTIONS = ['office', 'remote', 'hybrid', 'travel'] as const;

export const SENIORITY_LEVEL_OPTIONS = [
  'intern',
  'entry-level',
  'mid-level',
  'senior',
  'lead',
  'principal',
  'staff',
  'director',
  'vp',
  'c-level',
] as const;

export const REASON_FOR_LEAVING_OPTIONS = [
  'promotion',
  'better_opportunity',
  'relocation',
  'layoff',
  'termination',
  'contract_end',
  'career_change',
  'salary',
  'culture',
  'management',
  'growth',
  'personal',
] as const;

export interface OverviewFormValues {
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  employmentType: string;
  workArrangement: string;
  description: string;
  location: string;
}

export interface AchievementsFormValues {
  items: Array<{ value: string }>;
}

export interface TechnologiesFormValues {
  technologies: string;
}

export interface CompensationFormValues {
  baseSalary: string;
  signingBonus: string;
  annualBonus: string;
}

export interface TeamFormValues {
  seniorityLevel: string;
  department: string;
  teamSize: string;
  directReports: string;
  reportsTo: string;
}

export interface ExitFormValues {
  reasonForLeaving: string;
  exitNotes: string;
}

export function normalizePositionUpdates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  return {
    ...updates,
    title: updates.title !== undefined ? updates.title.trim() : undefined,
    company: updates.company !== undefined ? updates.company.trim() : undefined,
    description:
      updates.description !== undefined
        ? typeof updates.description === 'string'
          ? updates.description.trim()
          : updates.description
        : undefined,
    startDate: updates.startDate !== undefined ? normalizeDateInput(updates.startDate) : undefined,
    endDate: updates.endDate !== undefined ? normalizeDateInput(updates.endDate) : undefined,
    salaryLow:
      updates.salaryLow !== undefined ? normalizeCurrencyInput(updates.salaryLow) : undefined,
    salaryHigh:
      updates.salaryHigh !== undefined ? normalizeCurrencyInput(updates.salaryHigh) : undefined,
  };
}

export function normalizeMetadata(metadata: Record<string, unknown> | null) {
  if (metadata === null) {
    return null;
  }

  const normalized: Record<string, unknown> = { ...metadata };

  for (const key of ['company_size', 'industry', 'location', 'website'] as const) {
    if (typeof normalized[key] === 'string') {
      normalized[key] = normalizeOptionalText(normalized[key]);
    }
  }

  for (const key of ['achievements', 'technologies'] as const) {
    if (Array.isArray(normalized[key])) {
      normalized[key] = normalized[key]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    }
  }

  return normalized;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasDefinedUpdates(updates: Record<string, any>) {
  return Object.values(updates).some((value) => value !== undefined);
}

export function normalizeOptionalText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCurrencyInput(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const sanitized = value.replace(/[$,]/g, '').trim();
  if (!sanitized) {
    return null;
  }

  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function normalizeDateInput(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toMonthInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthYear(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
) {
  const start = formatMonthYear(startDate) ?? 'Start date not set';
  const end = formatMonthYear(endDate) ?? 'Present';
  return `${start} — ${end}`;
}

export function formatOptionalLabel(value: string | null | undefined) {
  if (!value) return null;
  return humanizeIdentifier(value);
}

export function formatCurrency(cents: number | null | undefined) {
  if (cents == null) {
    return null;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCurrencyInput(cents: number | null | undefined) {
  if (cents == null) {
    return '';
  }

  return `${cents / 100}`;
}

export function hasCompensation(workExperience: CareerPositionRecord) {
  return [workExperience.salaryLow, workExperience.salaryHigh].some(
    (value) => value !== null && value !== undefined,
  );
}

export function hasTeamDetails(workExperience: CareerPositionRecord) {
  return [workExperience.contactName, workExperience.contactPhone].some(
    (value) => value !== null && value !== undefined && value !== '',
  );
}

export function hasExitDetails(workExperience: CareerPositionRecord) {
  return (
    workExperience.projectStatus !== null &&
    workExperience.projectStatus !== undefined &&
    workExperience.projectStatus !== ''
  );
}
