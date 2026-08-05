import { dollarsToCents } from '~/lib/career/queries/utils';
import { JobApplicationStatus } from '~/types/career';

export class ApplicationFormError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationFormError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UpdateApplicationInput = Record<string, any>;

interface ParsedApplicationUpdate {
  application: UpdateApplicationInput;
}

const NULLABLE_STRING_FIELDS = [
  'location',
  'source',
  'jobPostingUrl',
  'notes',
  'referredBy',
  'currentStage',
] as const;

const DATE_FIELDS = ['appliedAt'] as const;

const CENTS_FIELDS = ['salaryExpectation'] as const;

const VALID_STATUSES = new Set(Object.values(JobApplicationStatus));

function getRaw(formData: FormData, key: string): string | null | undefined {
  if (!formData.has(key)) return undefined;
  const value = formData.get(key);
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new ApplicationFormError(`Invalid value for ${key}`);
  }
  return value;
}

function parseNullableString(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

function parseDateField(raw: string | null, field: string): Date | null {
  if (raw === null || raw.trim() === '') return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new ApplicationFormError(`Invalid date for ${field}`);
  }
  return date;
}

function parseCentsField(raw: string | null, field: string): number | null {
  if (raw === null || raw.trim() === '') return null;
  const cleaned = raw.replace(/[$,\s]/g, '');
  const dollars = Number(cleaned);
  if (!Number.isFinite(dollars)) {
    throw new ApplicationFormError(`Invalid amount for ${field}`);
  }
  return dollarsToCents(dollars);
}

export function formatCentsInput(cents: number | null | undefined): string {
  if (cents == null) return '';
  return `${cents / 100}`;
}

export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0] ?? '';
}

export function parseApplicationUpdateFormData(formData: FormData): ParsedApplicationUpdate {
  const application: UpdateApplicationInput = {};
  let hasApplicationField = false;

  const titleRaw = getRaw(formData, 'title');
  if (titleRaw !== undefined) {
    const title = parseNullableString(titleRaw);
    if (!title) {
      throw new ApplicationFormError('Position is required');
    }
    application.title = title;
    hasApplicationField = true;
  }

  const statusRaw = getRaw(formData, 'status');
  if (statusRaw !== undefined) {
    const status = parseNullableString(statusRaw);
    if (!status || !VALID_STATUSES.has(status as JobApplicationStatus)) {
      throw new ApplicationFormError('Invalid status');
    }
    application.status = status;
    hasApplicationField = true;
  }

  for (const field of NULLABLE_STRING_FIELDS) {
    const raw = getRaw(formData, field);
    if (raw === undefined) continue;
    application[field] = parseNullableString(raw);
    hasApplicationField = true;
  }

  for (const field of DATE_FIELDS) {
    const raw = getRaw(formData, field);
    if (raw === undefined) continue;
    if (raw === null || raw.trim() === '') {
      throw new ApplicationFormError('Date is required');
    }
    application[field] = parseDateField(raw, field) as Date;
    hasApplicationField = true;
  }

  for (const field of CENTS_FIELDS) {
    const raw = getRaw(formData, field);
    if (raw === undefined) continue;
    application[field] = parseCentsField(raw, field);
    hasApplicationField = true;
  }

  if (!hasApplicationField) {
    throw new ApplicationFormError('No fields to update');
  }

  return { application };
}
