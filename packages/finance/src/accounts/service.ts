import crypto from 'node:crypto';

import { db } from '@hominem/db';
import type { Json } from '@hominem/db';
import { sql } from 'kysely';

import type { FinanceAccount, FinanceAccountRow } from '../lib/types';
import { toNumber } from '../lib/utils';

function toFinanceAccount(row: FinanceAccountRow): FinanceAccount {
  const data = (row.metadata ?? {}) as Record<string, unknown>;
  const plaidAccountId = data.plaidAccountId;
  return {
    id: row.id,
    userId: row.owner_userid,
    name: row.name,
    type: row.account_type,
    balance: toNumber(row.current_balance),
    plaidAccountId: typeof plaidAccountId === 'string' ? plaidAccountId : row.plaid_item_id,
  };
}

export async function createAccount(
  input: Partial<FinanceAccount> & { userId: string; name: string },
): Promise<FinanceAccount> {
  const id = input.id ?? crypto.randomUUID();
  const accountType = input.type ?? 'checking';
  const balance = input.balance ?? 0;
  const data: Json = input.plaidAccountId ? { plaidAccountId: input.plaidAccountId } : {};

  const result = await db
    .insertInto('app.finance_accounts')
    .values({
      id,
      owner_userid: input.userId,
      name: input.name,
      account_type: accountType,
      current_balance: balance,
      metadata: data,
    })
    .returningAll()
    .executeTakeFirst();

  if (!result) {
    throw new Error('Failed to create account');
  }

  return toFinanceAccount(result);
}

export async function listAccounts(userId: string): Promise<FinanceAccount[]> {
  const result = await db
    .selectFrom('app.finance_accounts')
    .selectAll()
    .where('owner_userid', '=', userId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result.map(toFinanceAccount);
}

export async function getAccountById(
  accountId: string,
  userId?: string,
): Promise<FinanceAccount | null> {
  if (userId) {
    const result = await db
      .selectFrom('app.finance_accounts')
      .selectAll()
      .where('id', '=', accountId)
      .where('owner_userid', '=', userId)
      .limit(1)
      .executeTakeFirst();
    const row = result ?? null;
    return row ? toFinanceAccount(row) : null;
  }

  const result = await db
    .selectFrom('app.finance_accounts')
    .selectAll()
    .where('id', '=', accountId)
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceAccount(row) : null;
}

export async function updateAccount(
  input: Partial<FinanceAccount> & { id: string },
): Promise<FinanceAccount | null> {
  const existing = await getAccountById(input.id, input.userId);
  if (!existing) {
    return null;
  }

  const nextName = input.name ?? existing.name;
  const nextType = input.type ?? existing.type;
  const nextBalance = input.balance ?? existing.balance;
  const nextPlaidAccountId =
    input.plaidAccountId === undefined ? (existing.plaidAccountId ?? null) : input.plaidAccountId;
  const nextData = nextPlaidAccountId ? { plaidAccountId: nextPlaidAccountId } : {};

  const result = await db
    .updateTable('app.finance_accounts')
    .set({
      name: nextName,
      account_type: nextType,
      current_balance: nextBalance,
      metadata: nextData,
      updatedat: new Date(),
    })
    .where('id', '=', input.id)
    .where('owner_userid', '=', existing.userId)
    .returningAll()
    .executeTakeFirst();

  const row = result ?? null;
  return row ? toFinanceAccount(row) : null;
}

export async function deleteAccount(accountId: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .deleteFrom('app.finance_accounts')
      .where('id', '=', accountId)
      .where('owner_userid', '=', userId)
      .executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  const result = await db
    .deleteFrom('app.finance_accounts')
    .where('id', '=', accountId)
    .executeTakeFirst();
  return (result?.numDeletedRows ?? 0n) > 0n;
}

export async function listAccountsWithRecentTransactions(
  userId: string,
): Promise<FinanceAccount[]> {
  return listAccounts(userId);
}

export async function getAccountWithPlaidInfo(
  accountId: string,
  userId: string,
): Promise<FinanceAccount | null> {
  return getAccountById(accountId, userId);
}

export async function listAccountsWithPlaidInfo(userId: string): Promise<FinanceAccount[]> {
  return listAccounts(userId);
}

export async function getAccountsForInstitution(
  institutionId: string,
  userId: string,
): Promise<FinanceAccount[]> {
  const result = await db
    .selectFrom('app.finance_accounts')
    .selectAll()
    .where('owner_userid', '=', userId)
    .where(sql<boolean>`institution_id = ${institutionId}`)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result.map(toFinanceAccount);
}

export async function upsertAccount(
  input: Partial<FinanceAccount> & { userId: string },
): Promise<FinanceAccount> {
  if (!input.name) {
    throw new Error('upsertAccount requires name');
  }

  if (input.plaidAccountId) {
    const existingResult = await db
      .selectFrom('app.finance_accounts')
      .selectAll()
      .where('owner_userid', '=', input.userId)
      .where(sql<boolean>`metadata ->> 'plaidAccountId' = ${input.plaidAccountId}`)
      .limit(1)
      .executeTakeFirst();
    const existing = existingResult ?? null;
    if (existing) {
      const updated = await updateAccount({
        id: existing.id,
        userId: input.userId,
        name: input.name,
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.balance !== undefined ? { balance: input.balance } : {}),
        plaidAccountId: input.plaidAccountId,
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
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.balance !== undefined ? { balance: input.balance } : {}),
    ...(input.plaidAccountId !== undefined ? { plaidAccountId: input.plaidAccountId } : {}),
  });
}

export async function getUserAccounts(userId: string, itemId?: string): Promise<FinanceAccount[]> {
  if (!itemId) {
    return listAccounts(userId);
  }

  const result = await db
    .selectFrom('app.finance_accounts')
    .selectAll()
    .where('owner_userid', '=', userId)
    .where(sql<boolean>`metadata ->> 'plaidItemId' = ${itemId}`)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result.map(toFinanceAccount);
}

export async function getAccountByPlaidId(
  plaidAccountId: string,
  userId?: string,
): Promise<FinanceAccount | null> {
  if (userId) {
    const result = await db
      .selectFrom('app.finance_accounts')
      .selectAll()
      .where('owner_userid', '=', userId)
      .where(sql<boolean>`metadata ->> 'plaidAccountId' = ${plaidAccountId}`)
      .limit(1)
      .executeTakeFirst();
    const row = result ?? null;
    return row ? toFinanceAccount(row) : null;
  }

  const result = await db
    .selectFrom('app.finance_accounts')
    .selectAll()
    .where(sql<boolean>`metadata ->> 'plaidAccountId' = ${plaidAccountId}`)
    .orderBy('createdat', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceAccount(row) : null;
}
