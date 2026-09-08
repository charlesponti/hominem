import { db } from '@hominem/db/core';
import { ValidationError } from '@hominem/db/errors';
import { sql } from 'kysely';

import { toNumber } from './utils';

const TRANSFER_TYPE = 'transfer';
const DEFAULT_WINDOW_DAYS = 2;
const DEFAULT_MIN_AMOUNT = 100;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const GATE_ROW_CAP = 100;

export interface TransferPairLeg {
  transactionId: string;
  accountId: string;
  accountName: string;
  postedOn: string;
  description: string | null;
  amount: number;
}

export interface TransferPair {
  absoluteAmount: number;
  first: TransferPairLeg;
  second: TransferPairLeg;
}

export interface FindTransferPairsInput {
  userId: string;
  windowDays?: number;
  minAmount?: number;
  limit?: number;
}

export interface DuplicateGroup {
  accountId: string;
  accountName: string;
  postedOn: string;
  absoluteAmount: number;
  description: string;
  count: number;
}

export interface SignViolation {
  transactionId: string;
  accountId: string;
  transactionType: string;
  amount: number;
}

export interface EmptyAccount {
  accountId: string;
  accountName: string;
}

export interface ValidationGates {
  totalTransactions: number;
  orphanTransactions: number;
  accountsWithNoTransactions: EmptyAccount[];
  duplicateGroups: DuplicateGroup[];
  duplicateGroupCount: number;
  signViolations: SignViolation[];
  signViolationCount: number;
  uncategorizedTransactions: number;
}

function toDateOnly(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

/**
 * Likely cross-account transfer pairs: same absolute amount on two different
 * accounts within a few days, both legs typed `transfer`. A matched pair is
 * usually one real transfer recorded twice — not a duplicate — so each leg
 * still needs a glance before either side is "fixed".
 */
export async function findTransferPairs(input: FindTransferPairsInput): Promise<TransferPair[]> {
  const windowDays = input.windowDays ?? DEFAULT_WINDOW_DAYS;
  const minAmount = input.minAmount ?? DEFAULT_MIN_AMOUNT;
  const limit = input.limit ?? DEFAULT_LIMIT;

  if (!Number.isInteger(windowDays) || windowDays < 0) {
    throw new ValidationError('windowDays must be a non-negative integer.');
  }
  if (!Number.isFinite(minAmount) || minAmount < 0) {
    throw new ValidationError('minAmount must be a non-negative number.');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ValidationError(`limit must be an integer between 1 and ${MAX_LIMIT}.`);
  }

  const rows = await db
    .selectFrom('app.financeTransactions as t1')
    .innerJoin('app.financeAccounts as a1', (join) =>
      join.onRef('a1.id', '=', 't1.accountId').on('a1.userId', '=', input.userId),
    )
    .innerJoin('app.financeTransactions as t2', (join) =>
      join.on('t2.userId', '=', input.userId).on('t2.transactionType', '=', TRANSFER_TYPE),
    )
    .innerJoin('app.financeAccounts as a2', (join) =>
      join.onRef('a2.id', '=', 't2.accountId').on('a2.userId', '=', input.userId),
    )
    .select([
      't1.id as t1Id',
      't1.accountId as t1AccountId',
      'a1.name as t1AccountName',
      't1.postedOn as t1PostedOn',
      't1.description as t1Description',
      't1.amount as t1Amount',
      't2.id as t2Id',
      't2.accountId as t2AccountId',
      'a2.name as t2AccountName',
      't2.postedOn as t2PostedOn',
      't2.description as t2Description',
      't2.amount as t2Amount',
    ])
    .where('t1.userId', '=', input.userId)
    .where('t1.transactionType', '=', TRANSFER_TYPE)
    .whereRef('t1.accountId', '!=', 't2.accountId')
    .where(sql<boolean>`t1.id < t2.id`)
    .where(sql<boolean>`abs(t1.amount) = abs(t2.amount)`)
    .where(sql<boolean>`abs(t1.amount) >= ${minAmount}`)
    .where(sql<boolean>`abs(t1.posted_on - t2.posted_on) <= ${windowDays}`)
    .orderBy(sql`abs(t1.amount)`, 'desc')
    .orderBy('t1.postedOn', 'desc')
    .limit(limit)
    .execute();

  return rows.map((row) => {
    const first: TransferPairLeg = {
      transactionId: row.t1Id,
      accountId: row.t1AccountId,
      accountName: row.t1AccountName,
      postedOn: toDateOnly(row.t1PostedOn),
      description: row.t1Description,
      amount: toNumber(row.t1Amount),
    };
    const second: TransferPairLeg = {
      transactionId: row.t2Id,
      accountId: row.t2AccountId,
      accountName: row.t2AccountName,
      postedOn: toDateOnly(row.t2PostedOn),
      description: row.t2Description,
      amount: toNumber(row.t2Amount),
    };
    const ordered =
      first.postedOn < second.postedOn ||
      (first.postedOn === second.postedOn && first.transactionId < second.transactionId)
        ? ([first, second] as const)
        : ([second, first] as const);
    return {
      absoluteAmount: Math.abs(first.amount),
      first: ordered[0],
      second: ordered[1],
    };
  });
}

/**
 * Validation gates ported from the pfin build pipeline: referential
 * integrity, empty accounts, duplicate candidates (same account, date,
 * absolute amount, and case-insensitive description), sign consistency
 * (debits never positive, credits never negative), and category coverage.
 * A healthy ledger reads all zeros except the coverage count.
 */
export async function getValidationGates(userId: string): Promise<ValidationGates> {
  const coverage = await db
    .selectFrom('app.financeTransactions')
    .select([
      sql<number>`count(*)`.as('total'),
      sql<number>`sum(case when category_id is null then 1 else 0 end)`.as('uncategorized'),
    ])
    .where('userId', '=', userId)
    .executeTakeFirstOrThrow();

  const orphans = await db
    .selectFrom('app.financeTransactions as transaction')
    .leftJoin('app.financeAccounts as account', (join) =>
      join.onRef('account.id', '=', 'transaction.accountId').on('account.userId', '=', userId),
    )
    .select(sql<number>`count(*)`.as('count'))
    .where('transaction.userId', '=', userId)
    .where('account.id', 'is', null)
    .executeTakeFirstOrThrow();

  const emptyAccounts = await db
    .selectFrom('app.financeAccounts as account')
    .select(['account.id as accountId', 'account.name as accountName'])
    .where('account.userId', '=', userId)
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom('app.financeTransactions as transaction')
            .select('transaction.id')
            .whereRef('transaction.accountId', '=', 'account.id')
            .where('transaction.userId', '=', userId),
        ),
      ),
    )
    .orderBy('account.name', 'asc')
    .execute();

  const duplicateGroups = await db
    .selectFrom('app.financeTransactions as transaction')
    .innerJoin('app.financeAccounts as account', (join) =>
      join.onRef('account.id', '=', 'transaction.accountId').on('account.userId', '=', userId),
    )
    .select([
      'transaction.accountId as accountId',
      'account.name as accountName',
      'transaction.postedOn as postedOn',
      sql<number>`abs(transaction.amount)`.as('absoluteAmount'),
      sql<string>`lower(transaction.description)`.as('description'),
      sql<number>`count(*)`.as('count'),
    ])
    .where('transaction.userId', '=', userId)
    .groupBy([
      'transaction.accountId',
      'account.name',
      'transaction.postedOn',
      sql`abs(transaction.amount)`,
      sql`lower(transaction.description)`,
    ])
    .having(sql<boolean>`count(*) > 1`)
    .orderBy(sql`abs(transaction.amount)`, 'desc')
    .limit(GATE_ROW_CAP)
    .execute();

  const duplicateCount = await sql<{ count: number }>`
    select count(*) as count from (
      select 1
      from app.finance_transactions
      where user_id = ${userId}
      group by account_id, posted_on, abs(amount), lower(description)
      having count(*) > 1
    ) duplicate_groups
  `.execute(db);

  const signViolations = await db
    .selectFrom('app.financeTransactions')
    .select(['id', 'accountId', 'transactionType', 'amount'])
    .where('userId', '=', userId)
    .where(
      sql<boolean>`((transaction_type = 'debit' and amount > 0) or (transaction_type = 'credit' and amount < 0))`,
    )
    .orderBy(sql`abs(amount)`, 'desc')
    .limit(GATE_ROW_CAP)
    .execute();

  const signViolationCount = await sql<{ count: number }>`
    select count(*) as count
    from app.finance_transactions
    where user_id = ${userId}
      and (
        (transaction_type = 'debit' and amount > 0)
        or (transaction_type = 'credit' and amount < 0)
      )
  `.execute(db);

  return {
    totalTransactions: Number(coverage.total),
    orphanTransactions: Number(orphans.count),
    accountsWithNoTransactions: emptyAccounts.map((entry) => ({
      accountId: entry.accountId,
      accountName: entry.accountName,
    })),
    duplicateGroups: duplicateGroups.map((entry) => ({
      accountId: entry.accountId,
      accountName: entry.accountName,
      postedOn: toDateOnly(entry.postedOn),
      absoluteAmount: toNumber(entry.absoluteAmount),
      description: entry.description ?? '',
      count: Number(entry.count),
    })),
    duplicateGroupCount: Number(duplicateCount.rows[0]?.count ?? 0),
    signViolations: signViolations.map((entry) => ({
      transactionId: entry.id,
      accountId: entry.accountId,
      transactionType: entry.transactionType,
      amount: toNumber(entry.amount),
    })),
    signViolationCount: Number(signViolationCount.rows[0]?.count ?? 0),
    uncategorizedTransactions: Number(coverage.uncategorized),
  };
}
