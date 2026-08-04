import { createHash } from 'node:crypto';

import type { AccountGroup, AccountResolution, AccountSnapshot, ParsedRow } from './types';
import type { NewAccountDraft } from './types';

export function normalizeAccountLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, ' ');
}

export function normalizeAccountMask(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/[^0-9]/gu, '');
  return normalized || null;
}

function groupKeyFor(row: ParsedRow): string {
  return [normalizeAccountLabel(row.account), normalizeAccountMask(row.accountMask) ?? ''].join(
    '|',
  );
}

function groupImportKey(
  mask: string | null,
  account: string,
  snapshots: AccountSnapshot[],
  fileMaskGroupCount: number,
): string {
  const normalizedAccount = normalizeAccountLabel(account);
  if (!mask) return `copilot:label:${normalizedAccount}`;

  const matchingMasks = snapshots.filter(
    (snapshot) => normalizeAccountMask(snapshot.mask) === mask,
  );
  if (matchingMasks.length > 1 || fileMaskGroupCount > 1) {
    return `copilot:mask:${mask}:label:${normalizedAccount}`;
  }
  return `copilot:mask:${mask}`;
}

function tempKey(importKey: string): string {
  return `new:${createHash('sha256').update(importKey).digest('hex').slice(0, 24)}`;
}

export function resolveCopilotAccounts(
  rows: ParsedRow[],
  snapshots: AccountSnapshot[],
): AccountResolution {
  const grouped = new Map<string, { rowIndexes: number[]; row: ParsedRow }>();
  rows.forEach((row, index) => {
    const groupKey = groupKeyFor(row);
    const group = grouped.get(groupKey);
    if (group) group.rowIndexes.push(index);
    else grouped.set(groupKey, { rowIndexes: [index], row });
  });

  const groups: AccountGroup[] = [];
  const accountsToCreate: NewAccountDraft[] = [];
  const fileMaskGroupCounts = new Map<string, number>();

  for (const value of grouped.values()) {
    const mask = normalizeAccountMask(value.row.accountMask);
    if (mask) fileMaskGroupCounts.set(mask, (fileMaskGroupCounts.get(mask) ?? 0) + 1);
  }

  for (const [groupKey, value] of grouped) {
    const mask = normalizeAccountMask(value.row.accountMask);
    const account = normalizeAccountLabel(value.row.account);
    const importKey = groupImportKey(
      mask,
      account,
      snapshots,
      mask ? (fileMaskGroupCounts.get(mask) ?? 0) : 0,
    );
    const exactKeyMatch = snapshots.find((snapshot) => snapshot.csvImportKey === importKey);
    const maskMatches = snapshots.filter(
      (snapshot) => normalizeAccountMask(snapshot.mask) === mask,
    );
    const labelMatches = snapshots.filter(
      (snapshot) => normalizeAccountLabel(snapshot.name) === account,
    );

    let matchedAccountId = exactKeyMatch?.id ?? null;
    if (!matchedAccountId && mask) {
      if (maskMatches.length === 1) matchedAccountId = maskMatches[0]?.id ?? null;
      else if (maskMatches.length > 1 && labelMatches.length === 1) {
        matchedAccountId = labelMatches[0]?.id ?? null;
      }
    } else if (!matchedAccountId && !mask && labelMatches.length === 1) {
      matchedAccountId = labelMatches[0]?.id ?? null;
    }

    const group: AccountGroup = {
      groupKey,
      importKey,
      account: value.row.account,
      accountMask: mask,
      rowIndexes: value.rowIndexes,
      matchedAccountId,
      unresolved: matchedAccountId === null,
    };
    groups.push(group);

    if (!matchedAccountId) {
      accountsToCreate.push({
        groupKey,
        importKey,
        name: value.row.account,
        mask,
        provider: 'copilot-money',
        accountType: 'depository',
      });
    }
  }

  return { groups, accountsToCreate };
}

export function accountTempKey(importKey: string): string {
  return tempKey(importKey);
}
