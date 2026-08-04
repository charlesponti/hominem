import { parse } from 'csv-parse/sync';

import {
  COPILOT_STATUSES,
  COPILOT_TRANSACTION_TYPES,
  type CopilotRawRow,
  type CopilotStatus,
  type CopilotTransactionType,
  type ParsedFile,
  type ParsedRow,
  type ParseFailure,
} from './types';

const REQUIRED_HEADERS = [
  'date',
  'name',
  'amount',
  'status',
  'category',
  'parent category',
  'excluded',
  'tags',
  'type',
  'account',
  'account mask',
  'note',
  'recurring',
] as const;

const MAX_INVALID_ROWS = 50;

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? '';
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

function parseAmount(value: string): string {
  const normalized = value.trim().replaceAll(',', '').replaceAll('$', '');
  const isParenthesized = normalized.startsWith('(') && normalized.endsWith(')');
  const unsigned = isParenthesized ? normalized.slice(1, -1) : normalized;

  if (!/^-?\d+(\.\d+)?$/.test(unsigned)) {
    throw new Error(`invalid amount: ${value}`);
  }

  const number = Number(unsigned);
  if (!Number.isFinite(number)) {
    throw new Error(`invalid amount: ${value}`);
  }

  const sign = isParenthesized ? '-' : unsigned.startsWith('-') ? '-' : '';
  const digits = unsigned.replace(/^-/, '');
  const [whole, fraction = ''] = digits.split('.');
  return `${sign}${whole}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

function parseDate(value: string): string {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`invalid date: ${value}`);
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`invalid date: ${value}`);
  }
  return normalized;
}

function parseEnum<T extends string>(value: string, options: readonly T[], field: string): T {
  const normalized = value.trim().toLowerCase();
  const result = options.find((option) => option === normalized);
  if (!result) {
    throw new Error(`unsupported ${field}: ${value}`);
  }
  return result;
}

function parseTags(value: string): string[] {
  return value
    .split(/[;,|]/u)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeMask(value: string): string | null {
  const normalized = value.trim().replace(/[^0-9]/gu, '');
  return normalized || null;
}

function parseRow(record: CopilotRawRow, line: number): ParsedRow {
  const status = parseEnum<CopilotStatus>(record.status, COPILOT_STATUSES, 'status');
  const type = parseEnum<CopilotTransactionType>(
    record.type,
    COPILOT_TRANSACTION_TYPES,
    'transaction type',
  );
  const account = normalizeText(record.account);
  if (!account) throw new Error('account is required');

  return {
    line,
    date: parseDate(record.date),
    name: normalizeText(record.name),
    amount: parseAmount(record.amount),
    status,
    category: normalizeText(record.category) || null,
    parentCategory: normalizeText(record['parent category']) || null,
    excluded: parseBoolean(record.excluded),
    tags: parseTags(record.tags),
    type,
    account,
    accountMask: normalizeMask(record['account mask']),
    note: normalizeText(record.note) || null,
    recurring: normalizeText(record.recurring) || null,
    raw: record,
  };
}

export function parseCopilotCsv(input: ArrayBuffer | Buffer | string): ParsedFile | ParseFailure {
  const text =
    typeof input === 'string'
      ? input
      : Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input).toString('utf8');

  let records: CopilotRawRow[];
  let headers: string[];
  try {
    records = parse(text, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      relax_column_count: false,
      trim: false,
    }) as CopilotRawRow[];
    headers = records.length > 0 ? Object.keys(records[0] ?? {}) : [];
  } catch (error) {
    return {
      kind: 'malformed-file',
      message: error instanceof Error ? error.message : 'Malformed CSV file',
    };
  }

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    return {
      kind: 'malformed-file',
      message: `Not a supported Copilot Money export. Missing headers: ${missingHeaders.join(', ')}`,
    };
  }

  const rows: ParsedRow[] = [];
  const invalidRows: Array<{ line: number; reason: string }> = [];
  records.forEach((record, index) => {
    const line = index + 2;
    try {
      rows.push(parseRow(record, line));
    } catch (error) {
      if (invalidRows.length < MAX_INVALID_ROWS) {
        invalidRows.push({
          line,
          reason: error instanceof Error ? error.message : 'Invalid row',
        });
      }
    }
  });

  return { rows, invalidRows, headers };
}
