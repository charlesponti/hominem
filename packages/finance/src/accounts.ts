import crypto from 'node:crypto';

import { db } from '@hominem/db/core';
import type { AppFinanceAccounts } from '@hominem/db/types';
import type { Insertable, Selectable, Updateable } from 'kysely';

import { getAffectedRows } from './utils';

export type AccountWithBalance = Selectable<AppFinanceAccounts> & { currentBalance: number };

type CreateAccountInput = Partial<Insertable<AppFinanceAccounts>> & {
  userId: string;
  name: string;
};

type UpdateAccountInput = Partial<Updateable<AppFinanceAccounts>> & {
  id: string;
  userId?: string;
};

type UpsertAccountInput = Partial<Insertable<AppFinanceAccounts>> & {
  userId: string;
};

async function getBalances(accountIds: string[]): Promise<Map<string, number>> {
  if (accountIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .selectFrom('app.financeTransactions')
    .select((eb) => ['accountId', eb.fn.sum<number>('amount').as('balance')])
    .where('accountId', 'in', accountIds)
    .where('pending', '=', false)
    .groupBy('accountId')
    .execute();

  return new Map(rows.map((row) => [row.accountId, Number(row.balance ?? 0)]));
}

async function withBalance<T extends Selectable<AppFinanceAccounts>>(
  account: T,
): Promise<T & { currentBalance: number }> {
  const balances = await getBalances([account.id]);
  return { ...account, currentBalance: balances.get(account.id) ?? 0 };
}

async function withBalances<T extends Selectable<AppFinanceAccounts>>(
  accounts: T[],
): Promise<(T & { currentBalance: number })[]> {
  const balances = await getBalances(accounts.map((account) => account.id));
  return accounts.map((account) => ({
    ...account,
    currentBalance: balances.get(account.id) ?? 0,
  }));
}

export async function createAccount(input: CreateAccountInput): Promise<AccountWithBalance> {
  const id = input.id ?? crypto.randomUUID();
  const accountType = input.accountType ?? 'checking';

  const result = await db
    .insertInto('app.financeAccounts')
    .values({
      id,
      userId: input.userId,
      name: input.name,
      accountType,
      metadata: input.metadata ?? {},
      ...(input.plaidAccountId ? { plaidAccountId: input.plaidAccountId } : {}),
      ...(input.plaidItemId ? { plaidItemId: input.plaidItemId } : {}),
    })
    .returningAll()
    .executeTakeFirst();

  if (!result) {
    throw new Error('Failed to create account');
  }

  return withBalance(result);
}

function accountsForUser(userId: string) {
  return db
    .selectFrom('app.financeAccounts')
    .where('userId', '=', userId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc');
}

export async function listAccounts(userId: string): Promise<AccountWithBalance[]> {
  const accounts = await accountsForUser(userId).selectAll().execute();
  return withBalances(accounts);
}

export async function getAccountById(
  accountId: string,
  userId?: string,
): Promise<AccountWithBalance | null> {
  if (userId) {
    const result = await db
      .selectFrom('app.financeAccounts')
      .selectAll()
      .where('id', '=', accountId)
      .where('userId', '=', userId)
      .limit(1)
      .executeTakeFirst();
    return result ? withBalance(result) : null;
  }

  const result = await db
    .selectFrom('app.financeAccounts')
    .selectAll()
    .where('id', '=', accountId)
    .limit(1)
    .executeTakeFirst();
  return result ? withBalance(result) : null;
}

export async function updateAccount(input: UpdateAccountInput): Promise<AccountWithBalance | null> {
  const existing = await getAccountById(input.id, input.userId);
  if (!existing) {
    return null;
  }

  const nextName = input.name ?? existing.name;
  const nextType = input.accountType ?? existing.accountType;

  const result = await db
    .updateTable('app.financeAccounts')
    .set({
      name: nextName,
      accountType: nextType,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: new Date(),
    })
    .where('id', '=', input.id)
    .where('userId', '=', existing.userId)
    .returningAll()
    .executeTakeFirst();

  return result ? withBalance(result) : null;
}

export async function deleteAccount(accountId: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .deleteFrom('app.financeAccounts')
      .where('id', '=', accountId)
      .where('userId', '=', userId)
      .executeTakeFirst();
    return getAffectedRows(result) > 0;
  }

  const result = await db
    .deleteFrom('app.financeAccounts')
    .where('id', '=', accountId)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export const listAccountsWithRecentTransactions = listAccounts;

export const getAccountWithPlaidInfo = getAccountById;

export const listAccountsWithPlaidInfo = listAccounts;

export interface AccountImportSnapshot {
  id: string;
  name: string;
  mask: string | null;
  csvImportKey: string | null;
}

/** Narrow account rows for the import preflight flow (no balance queries). */
export async function listImportAccountSnapshots(userId: string): Promise<AccountImportSnapshot[]> {
  return accountsForUser(userId).select(['id', 'name', 'mask', 'csvImportKey']).execute();
}

/** How many of the given ids are owned by the user (idempotency/ownership guard). */
export async function countOwnedAccounts(userId: string, accountIds: string[]): Promise<number> {
  const uniqueIds = [...new Set(accountIds)];
  if (uniqueIds.length === 0) return 0;
  const rows = await db
    .selectFrom('app.financeAccounts')
    .select('id')
    .where('userId', '=', userId)
    .where('id', 'in', uniqueIds)
    .execute();
  return rows.length;
}

export async function getAccountsForInstitution(
  institutionId: string,
  userId: string,
): Promise<AccountWithBalance[]> {
  const accounts = await db
    .selectFrom('app.financeAccounts')
    .selectAll()
    .where('userId', '=', userId)
    .where('institutionId', '=', institutionId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();

  return withBalances(accounts);
}

export async function upsertAccount(input: UpsertAccountInput): Promise<AccountWithBalance> {
  if (!input.name) {
    throw new Error('upsertAccount requires name');
  }

  if (input.plaidAccountId) {
    const existingResult = await db
      .selectFrom('app.financeAccounts')
      .selectAll()
      .where('userId', '=', input.userId)
      .where('plaidAccountId', '=', input.plaidAccountId)
      .limit(1)
      .executeTakeFirst();
    const existing = existingResult ?? null;
    if (existing) {
      const updated = await updateAccount({
        id: existing.id,
        userId: input.userId,
        name: input.name,
        ...(input.accountType ? { accountType: input.accountType } : {}),
        metadata: input.metadata,
      });
      if (!updated) {
        throw new Error('Failed to update existing plaid account');
      }
      return updated;
    }
  }

  return createAccount({
    userId: input.userId,
    name: input.name,
    ...(input.id !== undefined ? { id: input.id } : {}),
    ...(input.accountType ? { accountType: input.accountType } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.plaidAccountId ? { plaidAccountId: input.plaidAccountId } : {}),
    ...(input.plaidItemId ? { plaidItemId: input.plaidItemId } : {}),
  });
}

export async function getUserAccounts(
  userId: string,
  itemId?: string,
): Promise<AccountWithBalance[]> {
  if (!itemId) {
    return listAccounts(userId);
  }

  const accounts = await db
    .selectFrom('app.financeAccounts')
    .selectAll()
    .where('userId', '=', userId)
    .where('plaidItemId', '=', itemId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();

  return withBalances(accounts);
}

export async function getAccountByPlaidId(
  plaidAccountId: string,
  userId?: string,
): Promise<AccountWithBalance | null> {
  if (userId) {
    const result = await db
      .selectFrom('app.financeAccounts')
      .selectAll()
      .where('userId', '=', userId)
      .where('plaidAccountId', '=', plaidAccountId)
      .limit(1)
      .executeTakeFirst();
    return result ? withBalance(result) : null;
  }

  const result = await db
    .selectFrom('app.financeAccounts')
    .selectAll()
    .where('plaidAccountId', '=', plaidAccountId)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst();
  return result ? withBalance(result) : null;
}
