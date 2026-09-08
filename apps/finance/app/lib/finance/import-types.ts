import type { ImportPreflight } from '@hominem/queues';

/**
 * Shared client/server shapes for the Copilot import flow. The server route
 * handlers (finance/import.server.ts) build these; the store and review UI
 * consume them. Keeping one copy in the app (instead of the old split
 * between the API's route module and the store's hand-rolled type) is what
 * guarantees a new plan field can never silently drop out of the UI.
 */

type ImportAccountGroupPreview = {
  groupKey: string;
  account: string;
  accountMask: string | null;
  matchedAccountId: string | null;
  unresolved: boolean;
};

type ImportPlanRowPreview = {
  rowId: string;
  line: number;
  groupKey: string;
  accountId: string | null;
  accountTempKey: string | null;
  selected: boolean;
  amount: string;
  postedOn: string;
  description: string;
  transactionType: string;
  /** True when the sign was inferred (internal transfers, unknown types) and must be eyeballed before commit. */
  needsReview: boolean;
  reviewReason: string | null;
  recurring: boolean;
  /** True when the ledger already holds this row under another source; deselected by default. */
  ledgerDuplicate: boolean;
  pending: boolean;
  excluded: boolean;
};

type ImportPreflightStats = {
  total: number;
  selected: number;
  skipped: number;
  invalid: number;
  unresolved: number;
  needsReview: number;
};

type ImportPlanPreview = {
  source: string;
  accountGroups: ImportAccountGroupPreview[];
  unresolvedGroups: Array<{ groupKey: string; rowIndexes: number[]; reason: string }>;
  duplicateCandidateRowIds: string[];
  invalidRows: Array<{ line: number; reason: string }>;
  transactions: ImportPlanRowPreview[];
  stats: ImportPreflightStats;
};

type ImportAccountPreview = { id: string; name: string; mask: string | null };

export type ImportPreflightPreview = {
  preflight: ImportPreflight;
  plan: ImportPlanPreview;
  accounts: ImportAccountPreview[];
};
