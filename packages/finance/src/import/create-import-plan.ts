import { createHash } from 'node:crypto';

import { accountTempKey } from './resolve-copilot-accounts';
import {
  COPILOT_PROVIDER,
  type AccountResolution,
  type AccountResolutionFailure,
  type AccountMapping,
  type ImportPlan,
  type ParsedRow,
  type PlannedTransaction,
} from './types';

function normalized(value: string | null): string {
  return value?.trim().toLowerCase().replace(/\s+/gu, ' ') ?? '';
}

function normalizedRowKey(row: ParsedRow): string {
  return JSON.stringify({
    date: row.date,
    name: normalized(row.name),
    amount: row.amount,
    status: row.status,
    category: normalized(row.category),
    parentCategory: normalized(row.parentCategory),
    excluded: row.excluded,
    tags: row.tags.map(normalized).sort(),
    type: row.type,
    note: normalized(row.note),
    recurring: normalized(row.recurring),
  });
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeAmount(row: ParsedRow): {
  amount: string;
  transactionType: PlannedTransaction['transactionType'];
} {
  if (row.type === 'internal transfer') {
    return { amount: row.amount, transactionType: 'transfer' };
  }

  const absolute = row.amount.replace(/^-/, '');
  if (row.type === 'income') return { amount: absolute, transactionType: 'credit' };
  return { amount: `-${absolute}`, transactionType: 'debit' };
}

export function createCopilotImportPlan(
  rows: ParsedRow[],
  resolution: AccountResolution,
  existingExternalIds: ReadonlySet<string> = new Set(),
): ImportPlan {
  const groupsByKey = new Map(resolution.groups.map((group) => [group.groupKey, group]));
  const unresolvedGroups: AccountResolutionFailure[] = resolution.groups
    .filter((group) => group.unresolved)
    .map((group) => ({
      groupKey: group.groupKey,
      rowIndexes: group.rowIndexes,
      reason: 'Account mapping requires confirmation',
    }));

  const occurrences = new Map<string, number>();
  const transactions: PlannedTransaction[] = [];
  const rowIdsByBaseKey = new Map<string, string[]>();
  const workingExternalIds = new Set(existingExternalIds);

  rows.forEach((row) => {
    const group = groupsByKey.get([normalized(row.account), normalized(row.accountMask)].join('|'));
    if (!group) return;

    const baseKey = `${group.importKey}|${normalizedRowKey(row)}`;
    const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
    occurrences.set(baseKey, occurrence);
    const rowId = hash(`${baseKey}|${occurrence}`);
    const externalId = hash(`${COPILOT_PROVIDER}|${rowId}`);
    const rowIds = rowIdsByBaseKey.get(baseKey) ?? [];
    rowIds.push(rowId);
    rowIdsByBaseKey.set(baseKey, rowIds);

    const { amount, transactionType } = normalizeAmount(row);
    const transaction: PlannedTransaction = {
      rowId,
      line: row.line,
      groupKey: group.groupKey,
      accountImportKey: group.importKey,
      accountId: group.matchedAccountId,
      accountTempKey: group.matchedAccountId ? null : accountTempKey(group.importKey),
      externalId,
      selected: !workingExternalIds.has(externalId),
      amount,
      postedOn: row.date,
      description: row.name,
      merchantName: row.name,
      transactionType,
      pending: row.status === 'pending',
      excluded: row.excluded,
      notes: row.note,
      category: row.category,
      parentCategory: row.parentCategory,
      tags: row.tags,
      providerPayload: row.raw,
    };
    if (transaction.selected) workingExternalIds.add(externalId);
    transactions.push(transaction);
  });

  const duplicateCandidateRowIds = [...rowIdsByBaseKey.values()]
    .filter((rowIds) => rowIds.length > 1)
    .flat();

  const selected = transactions.filter((transaction) => transaction.selected).length;
  return {
    source: COPILOT_PROVIDER,
    accountGroups: resolution.groups,
    transactions,
    accountsToCreate: resolution.accountsToCreate,
    unresolvedGroups,
    duplicateCandidateRowIds,
    invalidRows: [],
    stats: {
      total: rows.length,
      selected,
      skipped: transactions.length - selected,
      invalid: 0,
      unresolved: unresolvedGroups.reduce((count, group) => count + group.rowIndexes.length, 0),
    },
  };
}

export function updatePlanSelection(
  plan: ImportPlan,
  selectedRowIds: ReadonlySet<string>,
): ImportPlan {
  const transactions = plan.transactions.map((transaction) => ({
    ...transaction,
    selected: selectedRowIds.has(transaction.rowId),
  }));
  const selected = transactions.filter((transaction) => transaction.selected).length;
  return {
    ...plan,
    transactions,
    stats: {
      ...plan.stats,
      selected,
      skipped: transactions.length - selected,
    },
  };
}

export function applyAccountMappingsToPlan(
  plan: ImportPlan,
  mappings: readonly AccountMapping[],
): ImportPlan {
  const mappingByGroup = new Map(mappings.map((mapping) => [mapping.groupKey, mapping]));
  const unresolvedKeys = new Set(plan.unresolvedGroups.map((group) => group.groupKey));

  for (const groupKey of unresolvedKeys) {
    const mapping = mappingByGroup.get(groupKey);
    if (!mapping || (!mapping.accountId && !mapping.createNew)) {
      throw new Error(`Missing account mapping for group ${groupKey}`);
    }
    if (mapping.accountId && mapping.createNew) {
      throw new Error(`Account mapping cannot select an existing and new account together`);
    }
  }

  const transactions = plan.transactions.map((transaction) => {
    const mapping = mappingByGroup.get(transaction.groupKey);
    if (!mapping) return transaction;
    return mapping.accountId
      ? { ...transaction, accountId: mapping.accountId, accountTempKey: null }
      : transaction;
  });

  const accountsToCreate = plan.accountsToCreate.filter((draft) => {
    const mapping = mappingByGroup.get(draft.groupKey);
    return !mapping?.accountId;
  });

  return {
    ...plan,
    accountsToCreate,
    transactions,
    unresolvedGroups: [],
    stats: { ...plan.stats, unresolved: 0 },
  };
}
