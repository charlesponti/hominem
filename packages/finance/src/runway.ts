import { db } from '@hominem/db/core';
import { ValidationError } from '@hominem/db/errors';
import { sql } from 'kysely';

import { toNumber } from './utils';

const WEEKS_PER_MONTH = 365.25 / 12 / 7;
const DAYS_PER_MONTH = 30.4375;

// 'depository' is Plaid's umbrella for checking/savings-like accounts and is
// also the type the Copilot import assigns every newly created account, so
// leaving it out zeroes the projection for exactly the import-flow users.
const DEFAULT_LIQUID_TYPES = ['cash', 'checking', 'savings', 'depository'];
const DEFAULT_LOOKBACK_MONTHS = 3;
const DEFAULT_PROJECTION_WEEKS = 16;

export interface RunwayBudget {
  category: string;
  amount: number;
  note?: string;
}

export interface ComputeLedgerRunwayInput {
  userId: string;
  monthlyBudgets: RunwayBudget[];
  liquidAccountTypes?: string[];
  recurringLookbackMonths?: number;
  projectionWeeks?: number;
  asOf?: string;
}

export interface RunwayWeek {
  week: number;
  weekStart: string;
  weekEnd: string;
  beginningCash: number;
  recurringOutflows: number;
  variableAllowance: number;
  netChange: number;
  endingCash: number;
}

export interface LedgerRunway {
  asOfDate: string;
  liquidAccounts: Array<{ accountName: string; balance: number }>;
  startingCash: number;
  weeklyRecurringOutflow: number;
  recurringLookbackMonths: number;
  recurringTxnCount: number;
  weeklyVariableAllowance: number;
  monthlyBudgets: RunwayBudget[];
  weeks: RunwayWeek[];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function checkedDate(value: string | undefined): string {
  const date = value ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError('asOf must use YYYY-MM-DD format.');
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ValidationError('asOf must use YYYY-MM-DD format.');
  }
  return date;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/**
 * Week-by-week cash-flow projection computed live from the ledger — the pfin
 * `runway` port. Three inputs: starting cash is the ledger sum over liquid
 * account types (excluded rows ignored, pending rows included — the
 * `account_summary` semantics, not the pending-filtered service balances);
 * recurring outflow is the trailing average of `recurring`-flagged debits
 * (adjustments never count); the variable allowance is the configured
 * monthly category caps converted to a flat weekly figure. Nothing is
 * stored; every call derives from current data.
 */
export async function computeLedgerRunway(input: ComputeLedgerRunwayInput): Promise<LedgerRunway> {
  const asOfDate = checkedDate(input.asOf);
  const liquidTypes = input.liquidAccountTypes ?? DEFAULT_LIQUID_TYPES;
  const lookbackMonths = input.recurringLookbackMonths ?? DEFAULT_LOOKBACK_MONTHS;
  const projectionWeeks = input.projectionWeeks ?? DEFAULT_PROJECTION_WEEKS;

  if (!Number.isFinite(lookbackMonths) || lookbackMonths <= 0) {
    throw new ValidationError('recurringLookbackMonths must be a positive number.');
  }
  if (!Number.isInteger(projectionWeeks) || projectionWeeks <= 0) {
    throw new ValidationError('projectionWeeks must be a positive integer.');
  }
  for (const budget of input.monthlyBudgets) {
    if (!Number.isFinite(budget.amount) || budget.amount < 0) {
      throw new ValidationError('Monthly budget amounts must be finite and non-negative.');
    }
  }

  const liquidRows = await db
    .selectFrom('app.financeAccounts as account')
    .leftJoin('app.financeTransactions as transaction', (join) =>
      join
        .onRef('transaction.accountId', '=', 'account.id')
        .on('transaction.userId', '=', input.userId)
        .on('transaction.excluded', '=', false),
    )
    .select((eb) => [
      'account.name as accountName',
      eb.fn.sum<number>('transaction.amount').as('balance'),
    ])
    .where('account.userId', '=', input.userId)
    .where('account.accountType', 'in', liquidTypes)
    .groupBy(['account.id', 'account.name'])
    .orderBy('account.name', 'asc')
    .execute();

  const liquidAccounts = liquidRows.map((entry) => ({
    accountName: entry.accountName,
    balance: roundMoney(toNumber(entry.balance)),
  }));
  const startingCash = roundMoney(liquidAccounts.reduce((sum, entry) => sum + entry.balance, 0));

  const lookbackStart = addDays(asOfDate, -Math.round(lookbackMonths * DAYS_PER_MONTH));
  const recurringRow = await db
    .selectFrom('app.financeTransactions')
    .select((eb) => [eb.fn.countAll<number>().as('count'), eb.fn.sum<number>('amount').as('total')])
    .where('userId', '=', input.userId)
    .where('excluded', '=', false)
    .where('transactionType', '!=', 'adjustment')
    .where(sql<boolean>`amount < 0`)
    .where('recurring', '=', true)
    .where('postedOn', '>=', lookbackStart)
    .where('postedOn', '<=', asOfDate)
    .executeTakeFirst();
  const recurringTxnCount = Number(recurringRow?.count ?? 0);
  const weeklyRecurringOutflow = roundMoney(
    Math.abs(toNumber(recurringRow?.total ?? 0)) / (lookbackMonths * WEEKS_PER_MONTH),
  );

  const weeklyVariableAllowance = roundMoney(
    input.monthlyBudgets.reduce((sum, budget) => sum + budget.amount, 0) / WEEKS_PER_MONTH,
  );

  const weeks: RunwayWeek[] = [];
  let beginningCash = startingCash;
  let weekStart = asOfDate;
  for (let week = 1; week <= projectionWeeks; week++) {
    const weekEnd = addDays(weekStart, 6);
    const netChange = roundMoney(-(weeklyRecurringOutflow + weeklyVariableAllowance));
    const endingCash = roundMoney(beginningCash + netChange);
    weeks.push({
      week,
      weekStart,
      weekEnd,
      beginningCash: roundMoney(beginningCash),
      recurringOutflows: weeklyRecurringOutflow,
      variableAllowance: weeklyVariableAllowance,
      netChange,
      endingCash,
    });
    beginningCash = endingCash;
    weekStart = addDays(weekEnd, 1);
  }

  return {
    asOfDate,
    liquidAccounts,
    startingCash,
    weeklyRecurringOutflow,
    recurringLookbackMonths: lookbackMonths,
    recurringTxnCount,
    weeklyVariableAllowance,
    monthlyBudgets: input.monthlyBudgets,
    weeks,
  };
}
