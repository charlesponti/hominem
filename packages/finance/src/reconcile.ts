import crypto from 'node:crypto';

import { db } from '@hominem/db/core';
import { ValidationError } from '@hominem/db/errors';
import { sql } from 'kysely';

import { toNumber } from './utils';

export const RECONCILIATION_SOURCE = 'balance-reconciliation';
const ADJUSTMENT_TYPE = 'adjustment';

export interface ReconciliationStaleness {
  accountId: string;
  accountName: string;
  accountType: string;
  lifecycleStatus: string;
  balance: number;
  lastReconciled: string | null;
}

export interface LedgerBreakdownRow {
  description: string;
  count: number;
  positiveCount: number;
  negativeCount: number;
  signedSum: number;
  absSum: number;
}

export interface AccountLedgerBreakdown {
  accountId: string;
  accountName: string;
  balance: number;
  rows: LedgerBreakdownRow[];
}

export interface PostAdjustmentInput {
  userId: string;
  accountId: string;
  targetBalance: number;
  date?: string;
  note?: string;
  force?: boolean;
}

export interface PostAdjustmentResult {
  accountId: string;
  accountName: string;
  ledgerSumBefore: number;
  plug: number;
  alreadyReconciled: boolean;
  committed: boolean;
  transactionId: string | null;
  warnings: string[];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function checkedDate(value: string | undefined): string {
  const date = value ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError('date must use YYYY-MM-DD format.');
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ValidationError('date must use YYYY-MM-DD format.');
  }
  return date;
}

async function getLedgerSum(userId: string, accountId: string, asOf?: string): Promise<number> {
  let query = db
    .selectFrom('app.financeTransactions')
    .select((eb) => eb.fn.sum<number>('amount').as('total'))
    .where('userId', '=', userId)
    .where('accountId', '=', accountId)
    .where('excluded', '=', false);
  if (asOf) query = query.where('postedOn', '<=', asOf);
  const row = await query.executeTakeFirst();
  return roundMoney(toNumber(row?.total ?? 0));
}

/**
 * Staleness view: every account with its current ledger balance and the date
 * of its most recent reconciling `adjustment` entry, oldest- and
 * never-reconciled first. Balances are always plain ledger sums — an account
 * is never "wrong", it is only due for a fresh reading.
 */
export async function getReconciliationStaleness(
  userId: string,
): Promise<ReconciliationStaleness[]> {
  const accounts = await db
    .selectFrom('app.financeAccounts')
    .select(['id', 'name', 'accountType', 'lifecycleStatus'])
    .where('userId', '=', userId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();

  const balances = await db
    .selectFrom('app.financeTransactions')
    .select((eb) => ['accountId', eb.fn.sum<number>('amount').as('total')])
    .where('userId', '=', userId)
    .where('excluded', '=', false)
    .groupBy('accountId')
    .execute();
  const balanceByAccount = new Map(
    balances.map((entry) => [entry.accountId, roundMoney(toNumber(entry.total))]),
  );

  const reconciled = await db
    .selectFrom('app.financeTransactions')
    .select((eb) => ['accountId', eb.fn.max('postedOn').as('latest')])
    .where('userId', '=', userId)
    .where('transactionType', '=', ADJUSTMENT_TYPE)
    .where('source', '=', RECONCILIATION_SOURCE)
    .groupBy('accountId')
    .execute();
  const reconciledByAccount = new Map(
    reconciled.map((entry) => [entry.accountId, String(entry.latest)]),
  );

  return accounts
    .map((account) => ({
      accountId: account.id,
      accountName: account.name,
      accountType: account.accountType,
      lifecycleStatus: account.lifecycleStatus,
      balance: balanceByAccount.get(account.id) ?? 0,
      lastReconciled: reconciledByAccount.get(account.id) ?? null,
    }))
    .sort((left, right) => (left.lastReconciled ?? '').localeCompare(right.lastReconciled ?? ''));
}

/**
 * Per-description ledger breakdown for one account: row counts split by sign
 * plus signed and absolute sums, largest absolute sum first. A subset of
 * descriptions whose absolute sum lands exactly on a balance gap is the
 * classic signature of a sign bug on that subset.
 */
export async function getAccountLedgerBreakdown(
  userId: string,
  accountId: string,
): Promise<AccountLedgerBreakdown | null> {
  const account = await db
    .selectFrom('app.financeAccounts')
    .select(['id', 'name'])
    .where('id', '=', accountId)
    .where('userId', '=', userId)
    .executeTakeFirst();
  if (!account) return null;

  const rows = await db
    .selectFrom('app.financeTransactions')
    .select((eb) => [
      'description',
      eb.fn.countAll<number>().as('count'),
      eb.fn.sum<number>(sql`case when amount > 0 then 1 else 0 end`).as('positiveCount'),
      eb.fn.sum<number>(sql`case when amount < 0 then 1 else 0 end`).as('negativeCount'),
      eb.fn.sum<number>('amount').as('signedSum'),
      eb.fn.sum<number>(sql`abs(amount)`).as('absSum'),
    ])
    .where('userId', '=', userId)
    .where('accountId', '=', accountId)
    .groupBy('description')
    .orderBy(sql`sum(abs(amount))`, 'desc')
    .execute();

  return {
    accountId: account.id,
    accountName: account.name,
    balance: await getLedgerSum(userId, accountId),
    rows: rows.map((entry) => ({
      description: entry.description ?? '',
      count: Number(entry.count),
      positiveCount: toNumber(entry.positiveCount),
      negativeCount: toNumber(entry.negativeCount),
      signedSum: roundMoney(toNumber(entry.signedSum)),
      absSum: roundMoney(toNumber(entry.absSum)),
    })),
  };
}

/**
 * Reconcile one account to a real balance reading by posting a dated
 * `adjustment` plug transaction sized to close the gap exactly — the same
 * mechanism banks already use for reconciling entries. The gap is measured
 * as of the reading date (transactions after that date are untouched by the
 * plug, so both the historical reconciliation and later balances stay
 * correct). Never touches an existing row; a sub-cent gap is a no-op (no
 * $0 journal entry is booked).
 */
export async function postReconciliationAdjustment(
  input: PostAdjustmentInput,
): Promise<PostAdjustmentResult> {
  const date = checkedDate(input.date);
  const targetBalance = input.targetBalance;
  if (!Number.isFinite(targetBalance)) {
    throw new ValidationError('targetBalance must be a finite number.');
  }

  const account = await db
    .selectFrom('app.financeAccounts')
    .select(['id', 'name', 'accountType'])
    .where('id', '=', input.accountId)
    .where('userId', '=', input.userId)
    .executeTakeFirst();
  if (!account) {
    throw new ValidationError('Account was not found for the current user.');
  }

  const warnings: string[] = [];
  if (
    (account.accountType === 'credit_card' || account.accountType === 'loan') &&
    targetBalance > 0
  ) {
    warnings.push(
      `${account.name} is a ${account.accountType} — balance follows the money-out-negative ` +
        `convention (a debt owed shows negative), not the positive figure a banking app displays.`,
    );
  }

  const ledgerSumBefore = await getLedgerSum(input.userId, input.accountId, date);
  const plug = roundMoney(targetBalance - ledgerSumBefore);

  if (Math.abs(plug) < 0.01) {
    return {
      accountId: account.id,
      accountName: account.name,
      ledgerSumBefore,
      plug: 0,
      alreadyReconciled: true,
      committed: false,
      transactionId: null,
      warnings,
    };
  }

  const existing = await db
    .selectFrom('app.financeTransactions')
    .select('id')
    .where('userId', '=', input.userId)
    .where('accountId', '=', input.accountId)
    .where('transactionType', '=', ADJUSTMENT_TYPE)
    .where('source', '=', RECONCILIATION_SOURCE)
    .where('postedOn', '=', date)
    .executeTakeFirst();
  if (existing && !input.force) {
    throw new ValidationError(
      `An adjustment already exists for ${account.name} on ${date} — pass force to add another anyway.`,
    );
  }

  const externalId =
    existing && input.force
      ? `balance-recon|${input.accountId}|${date}|${crypto.randomUUID().slice(0, 8)}`
      : `balance-recon|${input.accountId}|${date}`;

  const inserted = await db
    .insertInto('app.financeTransactions')
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      accountId: input.accountId,
      amount: plug,
      transactionType: ADJUSTMENT_TYPE,
      description: 'Balance reconciliation adjustment',
      merchantName: null,
      postedOn: date,
      pending: false,
      excluded: false,
      source: RECONCILIATION_SOURCE,
      externalId,
      notes: input.note ?? `Balance reconciliation as of ${date}`,
      providerPayload: {},
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return {
    accountId: account.id,
    accountName: account.name,
    ledgerSumBefore,
    plug,
    alreadyReconciled: false,
    committed: true,
    transactionId: inserted.id,
    warnings,
  };
}
