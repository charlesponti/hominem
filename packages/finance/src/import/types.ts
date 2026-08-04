export const COPILOT_PROVIDER = 'copilot-money' as const;

export const COPILOT_TRANSACTION_TYPES = ['regular', 'income', 'internal transfer'] as const;
export type CopilotTransactionType = (typeof COPILOT_TRANSACTION_TYPES)[number];

export const COPILOT_STATUSES = ['posted', 'pending'] as const;
export type CopilotStatus = (typeof COPILOT_STATUSES)[number];

export type CopilotRawRow = Record<string, string>;

export interface ParsedRow {
  line: number;
  date: string;
  name: string;
  amount: string;
  status: CopilotStatus;
  category: string | null;
  parentCategory: string | null;
  excluded: boolean;
  tags: string[];
  type: CopilotTransactionType;
  account: string;
  accountMask: string | null;
  note: string | null;
  recurring: string | null;
  raw: CopilotRawRow;
}

export interface ParsedFile {
  rows: ParsedRow[];
  invalidRows: Array<{ line: number; reason: string }>;
  headers: string[];
}

export interface ParseFailure {
  kind: 'malformed-file';
  message: string;
}

export interface AccountSnapshot {
  id: string;
  name: string;
  mask: string | null;
  csvImportKey: string | null;
}

export interface AccountGroup {
  groupKey: string;
  importKey: string;
  account: string;
  accountMask: string | null;
  rowIndexes: number[];
  matchedAccountId: string | null;
  unresolved: boolean;
}

export interface NewAccountDraft {
  groupKey: string;
  importKey: string;
  name: string;
  mask: string | null;
  provider: typeof COPILOT_PROVIDER;
  accountType: 'depository';
}

export interface AccountResolution {
  groups: AccountGroup[];
  accountsToCreate: NewAccountDraft[];
}

export interface AccountResolutionFailure {
  groupKey: string;
  rowIndexes: number[];
  reason: string;
}

export interface PlannedTransaction {
  rowId: string;
  line: number;
  groupKey: string;
  accountImportKey: string;
  accountId: string | null;
  accountTempKey: string | null;
  externalId: string;
  selected: boolean;
  amount: string;
  postedOn: string;
  description: string;
  merchantName: string;
  transactionType: 'debit' | 'credit' | 'transfer';
  pending: boolean;
  excluded: boolean;
  notes: string | null;
  category: string | null;
  parentCategory: string | null;
  tags: string[];
  providerPayload: CopilotRawRow;
}

export interface ImportPlan {
  source: typeof COPILOT_PROVIDER;
  accountGroups: AccountGroup[];
  transactions: PlannedTransaction[];
  accountsToCreate: NewAccountDraft[];
  unresolvedGroups: AccountResolutionFailure[];
  duplicateCandidateRowIds: string[];
  invalidRows: Array<{ line: number; reason: string }>;
  stats: {
    total: number;
    selected: number;
    skipped: number;
    invalid: number;
    unresolved: number;
  };
}

export interface AccountMapping {
  groupKey: string;
  accountId?: string;
  createNew?: boolean;
}
