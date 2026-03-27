import { db } from '@hominem/db';
import { sql } from 'kysely';

import {
  FINANCE_TRANSACTION_ENTITY_TYPE,
  financeTransactionQueryContractSchema,
  type FinanceTransactionQueryContract,
} from '../contracts';
import type { FinanceAnalyticsTransaction } from '../lib/types';
import { toDateOnlyString, toNumber, sqlValueList } from '../lib/utils';

async function queryAnalyticsTransactionsCore(
  input: Partial<FinanceTransactionQueryContract> & { userId: string },
): Promise<FinanceAnalyticsTransaction[]> {
  const parsed = financeTransactionQueryContractSchema.parse({
    userId: input.userId,
    accountId: input.accountId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    limit: input.limit ?? 200,
    offset: input.offset ?? 0,
    tagIds: input.tagIds,
    tagNames: input.tagNames,
  });

  const tagIds = parsed.tagIds ?? [];
  const tagNames = parsed.tagNames ?? [];
  let query = db
    .selectFrom('app.finance_transactions as t')
    .select([
      't.id',
      't.owner_user_id',
      't.account_id',
      't.amount',
      't.description',
      't.posted_on',
      't.external_id',
      't.notes',
      't.merchant_name',
      sql<string>`coalesce((select min(tg_tag.name) from app.tag_assignments ti_tag join app.tags tg_tag on tg_tag.id = ti_tag.tag_id and tg_tag.owner_user_id = ${parsed.userId} where ti_tag.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE} and ti_tag.entity_id = t.id), t.notes, ${'Uncategorized'})`.as(
        'classification',
      ),
    ])
    .where('t.owner_user_id', '=', parsed.userId);

  if (parsed.accountId) {
    query = query.where('t.account_id', '=', parsed.accountId);
  }
  if (parsed.dateFrom) {
    query = query.where('t.posted_on', '>=', new Date(parsed.dateFrom));
  }
  if (parsed.dateTo) {
    query = query.where('t.posted_on', '<=', new Date(parsed.dateTo));
  }

  if (tagIds.length > 0 && tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (select 1 from app.tag_assignments ti_filter join app.tags tg_filter on tg_filter.id = ti_filter.tag_id and tg_filter.owner_user_id = ${parsed.userId} where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE} and ti_filter.entity_id = t.id and (ti_filter.tag_id in (${sqlValueList(tagIds)}) or tg_filter.name in (${sqlValueList(tagNames)})))`,
    );
  } else if (tagIds.length > 0) {
    query = query.where(
      sql<boolean>`exists (select 1 from app.tag_assignments ti_filter join app.tags tg_filter on tg_filter.id = ti_filter.tag_id and tg_filter.owner_user_id = ${parsed.userId} where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE} and ti_filter.entity_id = t.id and ti_filter.tag_id in (${sqlValueList(tagIds)}))`,
    );
  } else if (tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (select 1 from app.tag_assignments ti_filter join app.tags tg_filter on tg_filter.id = ti_filter.tag_id and tg_filter.owner_user_id = ${parsed.userId} where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE} and ti_filter.entity_id = t.id and tg_filter.name in (${sqlValueList(tagNames)}))`,
    );
  }

  const result = await query
    .orderBy('t.posted_on', 'desc')
    .orderBy('t.id', 'desc')
    .limit(parsed.limit)
    .offset(parsed.offset)
    .execute();

  return result.map((row) => ({
    id: row.id,
    userId: row.owner_user_id,
    accountId: row.account_id,
    amount: toNumber(row.amount),
    description: row.description ?? '',
    date: toDateOnlyString(row.posted_on),
    category: row.notes,
    merchantName: row.merchant_name,
    classification: row.classification,
  }));
}

export async function queryAnalyticsTransactionsByContract(
  input: Omit<Partial<FinanceTransactionQueryContract>, 'userId'> & { userId: string },
): Promise<FinanceAnalyticsTransaction[]> {
  return queryAnalyticsTransactionsCore(input);
}

export async function getTagBreakdown(
  _userId: string,
): Promise<Array<{ tag: string; total: number }>> {
  const result = await db
    .selectFrom('app.finance_transactions as t')
    .innerJoin('app.tag_assignments as ti', (join) =>
      join
        .onRef('ti.entity_id', '=', 't.id')
        .on('ti.entity_table', '=', FINANCE_TRANSACTION_ENTITY_TYPE),
    )
    .innerJoin('app.tags as tg', (join) =>
      join.onRef('tg.id', '=', 'ti.tag_id').on('tg.owner_user_id', '=', _userId),
    )
    .select([
      sql<string>`tg.name`.as('tag'),
      sql<number>`coalesce(sum(abs(amount)), 0)`.as('total'),
    ])
    .where('t.owner_user_id', '=', _userId)
    .where('t.transaction_type', '=', 'expense')
    .groupBy('tg.name')
    .orderBy(sql`total`, 'desc')
    .orderBy('tag', 'asc')
    .execute();

  return result.map((row) => ({
    tag: row.tag,
    total: toNumber(row.total),
  }));
}

export async function getTopMerchants(
  _userId: string,
): Promise<Array<{ merchant: string; total: number }>> {
  const result = await db
    .selectFrom('app.finance_transactions')
    .select(['merchant_name as merchant', sql<number>`coalesce(sum(abs(amount)), 0)`.as('total')])
    .where('owner_user_id', '=', _userId)
    .where('transaction_type', '=', 'expense')
    .where('merchant_name', 'is not', null)
    .where(sql<boolean>`merchant_name <> ''`)
    .groupBy('merchant_name')
    .orderBy(sql`total`, 'desc')
    .orderBy('merchant_name', 'asc')
    .limit(10)
    .execute();

  return result.map((row) => ({
    merchant: row.merchant ?? 'Unknown',
    total: toNumber(row.total),
  }));
}

export async function getTagBreakdownByContract(
  input: Omit<Partial<FinanceTransactionQueryContract>, 'userId'> & {
    userId: string;
    limit?: number;
  },
): Promise<Array<{ tag: string; amount: number; transactionCount: number }>> {
  const transactions = await queryAnalyticsTransactionsByContract(input);
  const breakdownByLabel = new Map<string, { amount: number; transactionCount: number }>();
  for (const tx of transactions) {
    if (tx.amount >= 0) {
      continue;
    }
    const current = breakdownByLabel.get(tx.classification) ?? { amount: 0, transactionCount: 0 };
    current.amount += Math.abs(tx.amount);
    current.transactionCount += 1;
    breakdownByLabel.set(tx.classification, current);
  }

  const normalizedLimit = Math.max(1, Math.floor(input.limit ?? 5));
  return [...breakdownByLabel.entries()]
    .map(([tag, value]) => ({
      tag,
      amount: value.amount,
      transactionCount: value.transactionCount,
    }))
    .sort((a, b) => b.amount - a.amount || a.tag.localeCompare(b.tag))
    .slice(0, normalizedLimit);
}

export async function getTopMerchantsByContract(
  input: Omit<Partial<FinanceTransactionQueryContract>, 'userId'> & {
    userId: string;
    limit?: number;
  },
): Promise<Array<{ name: string; totalSpent: number; transactionCount: number }>> {
  const transactions = await queryAnalyticsTransactionsByContract(input);
  const merchantTotals = new Map<string, { totalSpent: number; transactionCount: number }>();
  for (const tx of transactions) {
    if (tx.amount >= 0) {
      continue;
    }
    const merchantName = tx.merchantName ?? 'Unknown';
    const current = merchantTotals.get(merchantName) ?? { totalSpent: 0, transactionCount: 0 };
    current.totalSpent += Math.abs(tx.amount);
    current.transactionCount += 1;
    merchantTotals.set(merchantName, current);
  }

  const normalizedLimit = Math.max(1, Math.floor(input.limit ?? 5));
  return [...merchantTotals.entries()]
    .map(([name, value]) => ({
      name,
      totalSpent: value.totalSpent,
      transactionCount: value.transactionCount,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent || a.name.localeCompare(b.name))
    .slice(0, normalizedLimit);
}

export async function getMonthlyStatsByContract(input: {
  userId: string;
  month?: string;
}): Promise<{
  month: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  averageTransaction: number;
  topTag: string;
  topMerchant: string;
  tagSpending: Array<{ name: string; amount: number }>;
  startDate?: string;
  endDate?: string;
}> {
  const range = parseMonthRange(input.month);
  const transactions = await queryAnalyticsTransactionsByContract({
    userId: input.userId,
    ...(range.from ? { dateFrom: range.from } : {}),
    ...(range.to ? { dateTo: range.to } : {}),
    limit: 200,
    offset: 0,
  });

  let income = 0;
  let expenses = 0;
  const categoryTotals = new Map<string, number>();
  const merchantTotals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.amount >= 0) {
      income += tx.amount;
      continue;
    }
    const spend = Math.abs(tx.amount);
    expenses += spend;
    categoryTotals.set(tx.classification, (categoryTotals.get(tx.classification) ?? 0) + spend);
    const merchantName = tx.merchantName ?? 'Unknown';
    merchantTotals.set(merchantName, (merchantTotals.get(merchantName) ?? 0) + spend);
  }

  const topTag =
    [...categoryTotals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
    'Uncategorized';
  const topMerchant =
    [...merchantTotals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
    'Unknown';

  const transactionCount = transactions.length;
  const averageTransaction = transactionCount === 0 ? 0 : (income + expenses) / transactionCount;
  return {
    month: input.month ?? new Date().toISOString().slice(0, 7),
    income,
    expenses,
    net: income - expenses,
    transactionCount,
    averageTransaction,
    topTag,
    topMerchant,
    tagSpending: [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([name, amount]) => ({ name, amount })),
    ...(range.from ? { startDate: range.from } : {}),
    ...(range.to ? { endDate: range.to } : {}),
  };
}

export async function getSpendingTimeSeriesByContract(input: {
  userId: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  tagIds?: string[];
  tagNames?: string[];
  limit?: number;
  groupBy?: 'month' | 'week' | 'day';
  includeStats?: boolean;
}): Promise<{
  data: Array<{
    date: string;
    amount: number;
    expenses: number;
    income: number;
    count: number;
    average: number;
  }>;
  stats?: {
    total: number;
    average: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    changePercentage: number;
    totalIncome: number;
    totalExpenses: number;
    averageIncome: number;
    averageExpenses: number;
    count: number;
    periodCovered: string;
  };
}> {
  const transactions = await queryAnalyticsTransactionsByContract({
    userId: input.userId,
    ...(input.accountId ? { accountId: input.accountId } : {}),
    ...(input.dateFrom ? { dateFrom: input.dateFrom } : {}),
    ...(input.dateTo ? { dateTo: input.dateTo } : {}),
    ...(input.tagIds ? { tagIds: input.tagIds } : {}),
    ...(input.tagNames ? { tagNames: input.tagNames } : {}),
    limit: 200,
    offset: 0,
  });

  const bucketData = new Map<string, { income: number; expenses: number; count: number }>();
  for (const tx of transactions) {
    const bucketKey = getTimeSeriesBucket(tx.date, input.groupBy);
    const current = bucketData.get(bucketKey) ?? { income: 0, expenses: 0, count: 0 };
    if (tx.amount >= 0) {
      current.income += tx.amount;
    } else {
      current.expenses += Math.abs(tx.amount);
    }
    current.count += 1;
    bucketData.set(bucketKey, current);
  }

  const normalizedLimit = Math.max(1, Math.floor(input.limit ?? 50));
  const sortedDates = [...bucketData.keys()]
    .sort((a, b) => a.localeCompare(b))
    .slice(-normalizedLimit);
  const data = sortedDates.map((date) => {
    const values = bucketData.get(date) ?? { income: 0, expenses: 0, count: 0 };
    const total = values.income + values.expenses;
    return {
      date,
      amount: values.income - values.expenses,
      expenses: values.expenses,
      income: values.income,
      count: values.count,
      average: values.count === 0 ? 0 : total / values.count,
    };
  });

  if (!input.includeStats) {
    return { data };
  }

  const totals = data.map((item) => item.income + item.expenses);
  const total = totals.reduce((sum, value) => sum + value, 0);
  const first = totals[0] ?? 0;
  const last = totals[totals.length - 1] ?? 0;

  return {
    data,
    stats: {
      total,
      average: totals.length === 0 ? 0 : total / totals.length,
      min: totals.length === 0 ? 0 : Math.min(...totals),
      max: totals.length === 0 ? 0 : Math.max(...totals),
      trend: last > first ? 'up' : last < first ? 'down' : 'stable',
      changePercentage: first === 0 ? 0 : ((last - first) / first) * 100,
      totalIncome: data.reduce((sum, item) => sum + item.income, 0),
      totalExpenses: data.reduce((sum, item) => sum + item.expenses, 0),
      averageIncome:
        data.length === 0 ? 0 : data.reduce((sum, item) => sum + item.income, 0) / data.length,
      averageExpenses:
        data.length === 0 ? 0 : data.reduce((sum, item) => sum + item.expenses, 0) / data.length,
      count: data.length,
      periodCovered: input.groupBy ?? 'day',
    },
  };
}

export async function getTransactionTagAnalysis(
  _userId: string,
): Promise<Array<{ tag: string; total: number }>> {
  return getTagBreakdown(_userId);
}

function parseMonthRange(month?: string): { from?: string; to?: string } {
  if (!month) {
    return {};
  }
  const [yearRaw, monthRaw] = month.split('-');
  const year = Number.parseInt(yearRaw ?? '', 10);
  const monthValue = Number.parseInt(monthRaw ?? '', 10);
  if (!Number.isFinite(year) || !Number.isFinite(monthValue) || monthValue < 1 || monthValue > 12) {
    return {};
  }
  const from = new Date(Date.UTC(year, monthValue - 1, 1));
  const to = new Date(Date.UTC(year, monthValue, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function getTimeSeriesBucket(date: string, groupBy?: 'month' | 'week' | 'day'): string {
  if (groupBy === 'month') {
    return date.slice(0, 7);
  }
  if (groupBy === 'week') {
    const value = new Date(`${date}T00:00:00Z`);
    const day = value.getUTCDay() || 7;
    value.setUTCDate(value.getUTCDate() - day + 1);
    return value.toISOString().slice(0, 10);
  }
  return date;
}
