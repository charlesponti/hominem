export interface TrueUpInput {
  accountId: string;
  targetBalance: number;
  date?: string;
  note?: string;
  force: boolean;
}

export type TrueUpParseResult = { ok: true; value: TrueUpInput } | { ok: false; error: string };

function parseDate(value: string | null): string | undefined {
  const date = value?.trim() ?? '';
  if (!date) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    return undefined;
  }
  return date;
}

/** Validate a true-up form submission. Never throws — the route action maps `{ ok: false }` to a 400. */
export function parseTrueUpForm(formData: FormData): TrueUpParseResult {
  const accountId = String(formData.get('accountId') ?? '').trim();
  if (!accountId) return { ok: false, error: 'Choose an account.' };

  const rawBalance = String(formData.get('balance') ?? '').trim();
  const targetBalance = Number(rawBalance);
  if (rawBalance === '' || !Number.isFinite(targetBalance)) {
    return { ok: false, error: 'Enter a target balance as a number.' };
  }

  const rawDate = String(formData.get('date') ?? '');
  if (rawDate.trim() !== '' && parseDate(rawDate) === undefined) {
    return { ok: false, error: 'Use a real YYYY-MM-DD reading date.' };
  }

  const note = String(formData.get('note') ?? '').trim();

  return {
    ok: true,
    value: {
      accountId,
      targetBalance,
      ...(parseDate(rawDate) ? { date: parseDate(rawDate) } : {}),
      ...(note ? { note } : {}),
      force: formData.get('force') === 'on',
    },
  };
}

export interface TransfersFilters {
  windowDays: number;
  minAmount: number;
  limit: number;
}

export const DEFAULT_TRANSFERS_FILTERS: TransfersFilters = {
  windowDays: 2,
  minAmount: 100,
  limit: 50,
};

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) return fallback;
  return parsed;
}

function parseNonNegativeNumber(value: string | null, fallback: number): number {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

/** Parse transfer-pair filter params, falling back to defaults on anything invalid. */
export function parseTransfersParams(params: URLSearchParams): TransfersFilters {
  return {
    windowDays: parsePositiveInt(
      params.get('windowDays'),
      DEFAULT_TRANSFERS_FILTERS.windowDays,
      30,
    ),
    minAmount: parseNonNegativeNumber(params.get('minAmount'), DEFAULT_TRANSFERS_FILTERS.minAmount),
    limit: Math.max(1, parsePositiveInt(params.get('limit'), DEFAULT_TRANSFERS_FILTERS.limit, 500)),
  };
}
