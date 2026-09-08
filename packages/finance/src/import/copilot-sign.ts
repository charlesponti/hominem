import type { CopilotTransactionType, ParsedRow } from './types';

/**
 * A known collision where one Copilot `account` label covers rows that belong
 * to a different real account (e.g. Apple Savings vs American Express
 * Savings, ADR-0006 in the retired pfin pipeline). `descriptions` selects the
 * rows to redirect; `alwaysCreditDescriptions` marks the subset that is
 * always inbound on the target (ADR-0007), ignoring raw sign entirely.
 * Resolution never mints accounts — an unmatched target still goes through
 * normal account resolution so a human confirms it.
 */
export interface DescriptionAccountSplit {
  sourceAccount: string;
  targetAccount: string;
  csvAccountLabel?: string;
  descriptions: string[];
  alwaysCreditDescriptions?: string[];
}

export interface ResolvedSign {
  amount: string;
  transactionType: 'debit' | 'credit' | 'transfer';
  needsReview: boolean;
  reviewReason: string | null;
}

/**
 * Resolve a Copilot raw amount to the ledger's money-out-negative convention.
 * `income` rows are forced positive (Copilot's raw sign is unreliable there);
 * `internal transfer` rows take the majority-case negation but are always
 * flagged — a same-amount pair across two accounts is usually two legs of one
 * real transfer, and the direction must be confirmed, never guessed.
 */
export function resolveCopilotSign(
  type: CopilotTransactionType | string,
  rawAmount: string,
  options: { forceCredit?: boolean } = {},
): ResolvedSign {
  const absolute = rawAmount.replace(/^-/, '');
  if (options.forceCredit || type === 'income') {
    return { amount: absolute, transactionType: 'credit', needsReview: false, reviewReason: null };
  }
  if (type === 'internal transfer') {
    return {
      amount: `-${absolute}`,
      transactionType: 'transfer',
      needsReview: true,
      reviewReason: 'internal transfer — verify direction before committing',
    };
  }
  if (type === 'regular') {
    return {
      amount: `-${absolute}`,
      transactionType: 'debit',
      needsReview: false,
      reviewReason: null,
    };
  }
  return {
    amount: `-${absolute}`,
    transactionType: 'debit',
    needsReview: true,
    reviewReason: `unrecognized type '${type}' — sign not verified`,
  };
}

/**
 * Redirect rows whose Copilot account label is a known collision to the real
 * target account. Returns replacement rows (with `account` swapped) plus the
 * line numbers whose sign is forced credit by a verified always-credit rule.
 */
export function applyDescriptionSplits(
  rows: ParsedRow[],
  splits: readonly DescriptionAccountSplit[],
): { rows: ParsedRow[]; forcedCreditLines: Set<number> } {
  const forcedCreditLines = new Set<number>();
  const mapped = rows.map((row) => {
    const split = splits.find(
      (candidate) =>
        (candidate.csvAccountLabel ?? candidate.sourceAccount).toLowerCase() ===
          row.account.trim().toLowerCase() &&
        candidate.descriptions.some(
          (description) => description.toLowerCase() === row.name.trim().toLowerCase(),
        ),
    );
    if (!split) return row;
    if (
      (split.alwaysCreditDescriptions ?? []).some(
        (description) => description.toLowerCase() === row.name.trim().toLowerCase(),
      )
    ) {
      forcedCreditLines.add(row.line);
    }
    return { ...row, account: split.targetAccount };
  });
  return { rows: mapped, forcedCreditLines };
}

/**
 * Whether a Copilot `recurring` field marks an active series. The export
 * carries the series name (e.g. 'Netflix') instead of a boolean, so any
 * non-empty value other than 'false' counts.
 */
export function isRecurringActive(value: string | null): boolean {
  const normalized = value?.trim().toLowerCase() ?? '';
  return normalized !== '' && normalized !== 'false';
}

/**
 * Canonical ledger identity for cross-source dedup: resolved account,
 * posting date, absolute 2dp amount, and trimmed lowercase description.
 * Matches the pfin archive's dedup key, so a fresh Copilot export can
 * never re-import a row the books already hold under another source.
 */
export function ledgerCompositeKey(
  accountId: string,
  postedOn: string | Date,
  amount: string | number,
  description: string | null,
): string {
  const date =
    postedOn instanceof Date ? postedOn.toISOString().slice(0, 10) : postedOn.slice(0, 10);
  const absolute = Math.abs(Number(amount)).toFixed(2);
  return `${accountId}|${date}|${absolute}|${(description ?? '').trim().toLowerCase()}`;
}
