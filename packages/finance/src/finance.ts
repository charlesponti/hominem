import crypto from 'node:crypto';

import { db } from '@hominem/db';
import type { Database, Json } from '@hominem/db';
import { sql, type Selectable } from 'kysely';
import * as z from 'zod';

import type { FinanceTransactionQueryContract } from './contracts';
import {
  FINANCE_TRANSACTION_ENTITY_TYPE,
  financeTransactionQueryContractSchema,
} from './contracts';

type TimestampString = string;

interface FinanceAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  balance: number;
  plaidAccountId?: string | null;
}

type FinanceAccountRow = Selectable<Database['finance_accounts']>;

interface FinanceCategory {
  id: string;
  userId: string;
  name: string;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
}

interface FinanceTransaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  description: string | null;
  date: string;
  category?: string | null;
  merchantName?: string | null;
}

type FinanceTransactionRow = Selectable<Database['finance_transactions']>;

interface FinanceAnalyticsTransaction extends FinanceTransaction {
  classification: string;
}

type FinanceAnalyticsTransactionRow = Selectable<Database['finance_transactions']> & {
  classification: string;
};

type TagCategoryRow = Selectable<Database['tags']>;

interface PlaidItem {
  id: string;
  userId: string;
  itemId: string;
  institutionId?: string | null;
  transactionsCursor?: string | null;
  accessToken?: string | null;
  status?: string | null;
  lastSyncedAt?: string | null;
}

type PlaidItemRow = Selectable<Database['plaid_items']>;

interface Institution {
  id: string;
  name: string;
}

type InstitutionRow = Selectable<Database['financial_institutions']>;


function toNumber(value: string | number | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getAffectedRows(result: unknown): number {
  if (!result || typeof result !== 'object') {
    return 0;
  }
  if ('numDeletedRows' in result) {
    const value = (result as { numDeletedRows: bigint | number }).numDeletedRows;
    return Number(value);
  }
  if ('numUpdatedRows' in result) {
    const value = (result as { numUpdatedRows: bigint | number }).numUpdatedRows;
    return Number(value);
  }
  return 0;
}

function toFinanceAccount(row: FinanceAccountRow): FinanceAccount {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const plaidAccountId = data.plaidAccountId;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.account_type,
    balance: toNumber(row.balance),
    plaidAccountId: typeof plaidAccountId === 'string' ? plaidAccountId : null,
  };
}

function toFinanceTransaction(row: FinanceTransactionRow): FinanceTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    amount: toNumber(row.amount),
    description: row.description,
    date: String(row.date),
    category: row.category,
    merchantName: row.merchant_name,
  };
}

function toFinanceCategoryFromTag(row: TagCategoryRow): FinanceCategory {
  return {
    id: row.id,
    userId: row.owner_id,
    name: row.name,
    parentId: null,
    icon: null,
    color: row.color,
  };
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db
    .selectFrom(sql`information_schema.tables`.as('t'))
    .selectAll()
    .where(sql<boolean>`t.table_schema = 'public' and t.table_name = ${tableName}`)
    .executeTakeFirst();
  return Boolean(result);
}

function sqlValueList(values: string[]) {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}

export const runwayCalculationSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  monthlyExpenses: z.number().nonnegative(),
  cashReserve: z.number().nonnegative(),
});

export const calculateBudgetBreakdownInputSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  savingsTarget: z.number().nonnegative().optional(),
});

export const calculateSavingsGoalInputSchema = z.object({
  currentSavings: z.number().nonnegative(),
  goalAmount: z.number().nonnegative(),
  monthlyContribution: z.number().positive(),
  interestRate: z.number().nonnegative().optional(),
});

export const calculateBudgetSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  savingsTarget: z.number().nonnegative().optional(),
});

export function calculateBudgetBreakdown(
  input: z.infer<typeof calculateBudgetBreakdownInputSchema>,
): {
  needs: number;
  wants: number;
  savings: number;
  unallocated: number;
} {
  const { monthlyIncome: income, savingsTarget: savingsTarget = income * 0.2 } = input;

  const needs = income * 0.5;
  const wants = income * 0.3;
  const savings = Math.min(savingsTarget, income * 0.2);
  const unallocated = Math.max(0, income - needs - wants - savings);

  return {
    needs,
    wants,
    savings,
    unallocated,
  };
}

export function calculateSavingsGoal(input: z.infer<typeof calculateSavingsGoalInputSchema>): {
  months: number;
  interestEarned: number;
  totalContributions: number;
  finalAmount: number;
} {
  const rate = (input.interestRate ?? 0) / 12 / 100;
  const monthlyContribution = input.monthlyContribution;
  let balance = input.currentSavings;
  let months = 0;

  while (balance < input.goalAmount) {
    balance = balance * (1 + rate) + monthlyContribution;
    months += 1;
    if (months > 1200) break;
  }

  const totalContributions = input.currentSavings + monthlyContribution * months;
  const interestEarned = balance - totalContributions;

  return {
    months,
    interestEarned,
    totalContributions,
    finalAmount: balance,
  };
}

export async function deleteUserFinanceData(userId: string): Promise<{
  deletedTaggedItems: number;
  deletedTransactions: number;
  deletedAccounts: number;
  deletedBudgetGoals: number;
  deletedPlaidItems: number;
}> {
  const taggedItemsResult = await db
    .deleteFrom('tagged_items')
    .where(
      sql<boolean>`entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE} and entity_id in (select id from finance_transactions where user_id = ${userId})`,
    )
    .executeTakeFirst();
  const deletedTaggedItems = getAffectedRows(taggedItemsResult);

  const transactionsResult = await db
    .deleteFrom('finance_transactions')
    .where('user_id', '=', userId)
    .executeTakeFirst();
  const deletedTransactions = getAffectedRows(transactionsResult);

  const accountsResult = await db
    .deleteFrom('finance_accounts')
    .where('user_id', '=', userId)
    .executeTakeFirst();
  const deletedAccounts = getAffectedRows(accountsResult);

  let deletedBudgetGoals = 0;
  if (await tableExists('budget_goals')) {
    const budgetGoalsResult = await db
      .deleteFrom('budget_goals')
      .where('user_id', '=', userId)
      .executeTakeFirst();
    deletedBudgetGoals = getAffectedRows(budgetGoalsResult);
  }

  let deletedPlaidItems = 0;
  if (await tableExists('plaid_items')) {
    const plaidItemsResult = await db
      .deleteFrom('plaid_items')
      .where('user_id', '=', userId)
      .executeTakeFirst();
    deletedPlaidItems = getAffectedRows(plaidItemsResult);
  }

  return {
    deletedTaggedItems,
    deletedTransactions,
    deletedAccounts,
    deletedBudgetGoals,
    deletedPlaidItems,
  };
}

export async function deleteAllFinanceDataWithSummary(userId: string): Promise<{
  deletedTaggedItems: number;
  deletedTransactions: number;
  deletedAccounts: number;
  deletedBudgetGoals: number;
  deletedPlaidItems: number;
}> {
  return deleteUserFinanceData(userId);
}

export async function deleteAllFinanceData(userId: string): Promise<void> {
  await deleteUserFinanceData(userId);
}

export async function exportFinanceData(userId: string): Promise<{
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  tags: FinanceCategory[];
  budgetGoals: Array<{
    id: string;
    categoryId: string | null;
    targetAmount: number;
    targetPeriod: string;
  }>;
  plaidItems: PlaidItem[];
}> {
  const [accounts, transactions, tags] = await Promise.all([
    listAccounts(userId),
    queryTransactionsByContract({ userId, limit: 200, offset: 0 }),
    getTransactionTags(userId),
  ]);

  let budgetGoals: Array<{
    id: string;
    categoryId: string | null;
    targetAmount: number;
    targetPeriod: string;
  }> = [];
  if (await tableExists('budget_goals')) {
    const budgetGoalsResult = await db
      .selectFrom('budget_goals')
      .select(['id', 'category_id', 'target_amount', 'target_period'])
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'asc')
      .execute();
    budgetGoals = (
      budgetGoalsResult as Array<{
        id: string;
        category_id: string | null;
        target_amount: string | number;
        target_period: string;
      }>
    ).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      targetAmount: toNumber(row.target_amount),
      targetPeriod: row.target_period,
    }));
  }

  let plaidItems: PlaidItem[] = [];
  if (await tableExists('plaid_items')) {
    const plaidItemsResult = await db
      .selectFrom('plaid_items')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'asc')
      .execute();
    plaidItems = plaidItemsResult.map((row) => ({
      id: row.id,
      userId: row.user_id,
      itemId: row.item_id,
      institutionId: row.institution_id,
      transactionsCursor: row.cursor,
      accessToken: row.access_token,
      status: row.status,
      lastSyncedAt: row.last_synced_at,
    }));
  }

  return {
    accounts,
    transactions,
    tags,
    budgetGoals,
    plaidItems,
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
    .insertInto('finance_accounts')
    .values({
      id,
      user_id: input.userId,
      name: input.name,
      account_type: accountType,
      balance,
      data,
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
    .selectFrom('finance_accounts')
    .selectAll()
    .where('user_id', '=', userId)
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
      .selectFrom('finance_accounts')
      .selectAll()
      .where('id', '=', accountId)
      .where('user_id', '=', userId)
      .limit(1)
      .executeTakeFirst();
    const row = result ?? null;
    return row ? toFinanceAccount(row) : null;
  }

  const result = await db
    .selectFrom('finance_accounts')
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
    .updateTable('finance_accounts')
    .set({
      name: nextName,
      account_type: nextType,
      balance: nextBalance,
      data: nextData,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', input.id)
    .where('user_id', '=', existing.userId)
    .returningAll()
    .executeTakeFirst();

  const row = result ?? null;
  return row ? toFinanceAccount(row) : null;
}

export async function deleteAccount(accountId: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .deleteFrom('finance_accounts')
      .where('id', '=', accountId)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return getAffectedRows(result) > 0;
  }

  const result = await db
    .deleteFrom('finance_accounts')
    .where('id', '=', accountId)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
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

export async function listPlaidConnectionsForUser(userId: string): Promise<PlaidItem[]> {
  const result = await db
    .selectFrom('plaid_items')
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .execute();

  return result.map((row) => ({
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    institutionId: row.institution_id,
    transactionsCursor: row.cursor,
    accessToken: row.access_token,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
  }));
}

export async function getAccountsForInstitution(
  institutionId: string,
  userId: string,
): Promise<FinanceAccount[]> {
  const result = await db
    .selectFrom('finance_accounts')
    .selectAll()
    .where('user_id', '=', userId)
    .where(sql<boolean>`institution_id = ${institutionId}`)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result.map(toFinanceAccount);
}

export async function getTransactionTagAnalysis(
  _userId: string,
): Promise<Array<{ tag: string; total: number }>> {
  return getTagBreakdown(_userId);
}

export async function bulkCreateBudgetCategoriesFromTransactions(
  _userId: string,
): Promise<FinanceCategory[]> {
  const txCategoryResult = await db
    .selectFrom('finance_transactions')
    .select('category')
    .distinct()
    .where('user_id', '=', _userId)
    .where('category', 'is not', null)
    .where(sql<boolean>`category <> ''`)
    .orderBy('category', 'asc')
    .execute();
  const discovered = (txCategoryResult as Array<{ category: string }>)
    .map((row) => row.category)
    .filter((c) => c !== null) as string[];
  if (discovered.length === 0) {
    return [];
  }

  const existingResult = await db
    .selectFrom('tags')
    .select('name')
    .where('owner_id', '=', _userId)
    .execute();
  const existingNames = new Set(
    (existingResult as Array<{ name: string }>).map((row) => row.name.toLowerCase()),
  );

  const toCreate = discovered.filter((name) => !existingNames.has(name.toLowerCase()));
  if (toCreate.length === 0) {
    return [];
  }

  const created: FinanceCategory[] = [];
  for (const name of toCreate) {
    const category = await createBudgetCategory({
      userId: _userId,
      name,
    });
    created.push(category);
  }
  return created;
}

export async function getSpendingCategories(_userId: string): Promise<FinanceCategory[]> {
  const result = await db
    .selectFrom('tags')
    .selectAll()
    .where('owner_id', '=', _userId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result.map(toFinanceCategoryFromTag);
}

export async function getTransactionTags(userId: string): Promise<FinanceCategory[]> {
  return getSpendingCategories(userId);
}

export async function createBudgetCategory(
  input: Partial<FinanceCategory> & { userId: string; name: string },
): Promise<FinanceCategory> {
  const id = input.id ?? crypto.randomUUID();
  const result = await db
    .insertInto('tags')
    .values({
      id,
      owner_id: input.userId,
      name: input.name,
      color: input.color ?? null,
      description: input.icon ?? null,
    })
    .returningAll()
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    throw new Error('Failed to create budget category');
  }
  return toFinanceCategoryFromTag(row);
}

export async function updateBudgetCategory(
  id: string,
  userId: string,
  input: Partial<FinanceCategory>,
): Promise<FinanceCategory | null> {
  const existingResult = await db
    .selectFrom('tags')
    .selectAll()
    .where('id', '=', id)
    .where('owner_id', '=', userId)
    .limit(1)
    .executeTakeFirst();
  const existing = existingResult ?? null;
  if (!existing) {
    return null;
  }

  const result = await db
    .updateTable('tags')
    .set({
      name: input.name ?? existing.name,
      color: input.color === undefined ? existing.color : input.color,
    })
    .where('id', '=', id)
    .where('owner_id', '=', userId)
    .returningAll()
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceCategoryFromTag(row) : null;
}

export async function deleteBudgetCategory(id: string, userId: string): Promise<boolean> {
  const result = await db
    .deleteFrom('tags')
    .where('id', '=', id)
    .where('owner_id', '=', userId)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function getBudgetCategoryById(
  id: string,
  userId: string,
): Promise<FinanceCategory | null> {
  const result = await db
    .selectFrom('tags')
    .selectAll()
    .where('id', '=', id)
    .where('owner_id', '=', userId)
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceCategoryFromTag(row) : null;
}

export async function checkBudgetCategoryNameExists(
  userId: string,
  name: string,
): Promise<boolean> {
  const result = await db
    .selectFrom('tags')
    .select('id')
    .where('owner_id', '=', userId)
    .where('name', '=', name)
    .limit(1)
    .executeTakeFirst();
  return !!result;
}

export async function getUserExpenseCategories(userId: string): Promise<FinanceCategory[]> {
  return getAllBudgetCategories(userId);
}

export async function getAllBudgetCategories(userId: string): Promise<FinanceCategory[]> {
  const result = await db
    .selectFrom('tags')
    .selectAll()
    .where('owner_id', '=', userId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result.map(toFinanceCategoryFromTag);
}

export async function getBudgetCategoriesWithSpending(
  userId: string,
): Promise<Array<FinanceCategory & { spent: number }>> {
  const result = await db
    .selectFrom('tags as tg')
    .leftJoin('tagged_items as ti', (join) =>
      join
        .onRef('ti.tag_id', '=', 'tg.id')
        .on('ti.entity_type', '=', FINANCE_TRANSACTION_ENTITY_TYPE),
    )
    .leftJoin('finance_transactions as t', (join) =>
      join
        .onRef('t.id', '=', 'ti.entity_id')
        .onRef('t.user_id', '=', 'tg.owner_id')
        .on('t.transaction_type', '=', 'expense'),
    )
    .select([
      'tg.id',
      'tg.owner_id',
      'tg.name',
      'tg.color',
      sql<number>`coalesce(sum(abs(t.amount)), 0)`.as('spent'),
    ])
    .where('tg.owner_id', '=', userId)
    .groupBy(['tg.id', 'tg.owner_id', 'tg.name', 'tg.color'])
    .orderBy('tg.name', 'asc')
    .orderBy('tg.id', 'asc')
    .execute();

  return result.map((row) => ({
    id: row.id,
    userId: row.owner_id,
    name: row.name,
    parentId: null,
    icon: null,
    color: row.color,
    spent: toNumber(row.spent),
  }));
}

export async function getBudgetTrackingData(
  userId: string,
): Promise<{ totalBudget: number; totalSpent: number }> {
  const spentResult = await db
    .selectFrom('finance_transactions')
    .select(sql<number>`coalesce(sum(abs(amount)), 0)`.as('total_spent'))
    .where('user_id', '=', userId)
    .where('transaction_type', '=', 'expense')
    .executeTakeFirst();
  const totalSpent = spentResult ? toNumber(spentResult.total_spent) : 0;

  const hasBudgetGoals = await tableExists('budget_goals');
  if (!hasBudgetGoals) {
    return { totalBudget: 0, totalSpent };
  }

  const budgetResult = await db
    .selectFrom('budget_goals')
    .select(sql<number>`coalesce(sum(target_amount), 0)`.as('total_budget'))
    .where('user_id', '=', userId)
    .executeTakeFirst();
  return {
    totalBudget: budgetResult ? toNumber(budgetResult.total_budget) : 0,
    totalSpent,
  };
}

export async function getAllInstitutions(): Promise<Institution[]> {
  const result = await db
    .selectFrom('financial_institutions')
    .selectAll()
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result as Institution[];
}

export async function createInstitution(name: string): Promise<Institution> {
  const result = await db
    .insertInto('financial_institutions')
    .values({
      id: crypto.randomUUID(),
      name,
    })
    .returningAll()
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    throw new Error('Failed to create institution');
  }
  return row as Institution;
}

export function calculateRunway(input: z.infer<typeof runwayCalculationSchema>): {
  months: number;
} {
  const net = input.monthlyExpenses - input.monthlyIncome;
  if (net <= 0) {
    return { months: Number.POSITIVE_INFINITY };
  }
  return { months: input.cashReserve / net };
}

export async function getTagBreakdown(
  _userId: string,
): Promise<Array<{ tag: string; total: number }>> {
  const result = await db
    .selectFrom('finance_transactions as t')
    .innerJoin('tagged_items as ti', (join) =>
      join
        .onRef('ti.entity_id', '=', 't.id')
        .on('ti.entity_type', '=', FINANCE_TRANSACTION_ENTITY_TYPE),
    )
    .innerJoin('tags as tg', (join) =>
      join.onRef('tg.id', '=', 'ti.tag_id').on('tg.owner_id', '=', _userId),
    )
    .select([sql<string>`tg.name`.as('tag'), sql<number>`coalesce(sum(abs(amount)), 0)`.as('total')])
    .where('t.user_id', '=', _userId)
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
    .selectFrom('finance_transactions')
    .select([
      'merchant_name as merchant',
      sql<number>`coalesce(sum(abs(amount)), 0)`.as('total'),
    ])
    .where('user_id', '=', _userId)
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

export async function queryAnalyticsTransactionsByContract(
  input: Omit<Partial<FinanceTransactionQueryContract>, 'userId'> & { userId: string },
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
    .selectFrom('finance_transactions as t')
    .select([
      't.id',
      't.user_id',
      't.account_id',
      't.amount',
      't.description',
      't.date',
      't.external_id',
      't.category',
      't.merchant_name',
      sql<string>`coalesce((select min(tg_tag.name) from tagged_items ti_tag join tags tg_tag on tg_tag.id = ti_tag.tag_id and tg_tag.owner_id = ${parsed.userId} where ti_tag.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE} and ti_tag.entity_id = t.id), t.category, ${sql.lit('Uncategorized')})`.as(
        'classification',
      ),
    ])
    .where('t.user_id', '=', parsed.userId);

  if (parsed.accountId) {
    query = query.where('t.account_id', '=', parsed.accountId);
  }
  if (parsed.dateFrom) {
    query = query.where('t.date', '>=', parsed.dateFrom);
  }
  if (parsed.dateTo) {
    query = query.where('t.date', '<=', parsed.dateTo);
  }

  if (tagIds.length > 0 && tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (select 1 from tagged_items ti_filter join tags tg_filter on tg_filter.id = ti_filter.tag_id and tg_filter.owner_id = ${parsed.userId} where ti_filter.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE} and ti_filter.entity_id = t.id and (ti_filter.tag_id in (${sqlValueList(tagIds)}) or tg_filter.name in (${sqlValueList(tagNames)})))`,
    );
  } else if (tagIds.length > 0) {
    query = query.where(
      sql<boolean>`exists (select 1 from tagged_items ti_filter join tags tg_filter on tg_filter.id = ti_filter.tag_id and tg_filter.owner_id = ${parsed.userId} where ti_filter.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE} and ti_filter.entity_id = t.id and ti_filter.tag_id in (${sqlValueList(tagIds)}))`,
    );
  } else if (tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (select 1 from tagged_items ti_filter join tags tg_filter on tg_filter.id = ti_filter.tag_id and tg_filter.owner_id = ${parsed.userId} where ti_filter.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE} and ti_filter.entity_id = t.id and tg_filter.name in (${sqlValueList(tagNames)}))`,
    );
  }

  const result = await query
    .orderBy('t.date', 'desc')
    .orderBy('t.id', 'desc')
    .limit(parsed.limit)
    .offset(parsed.offset)
    .execute();

  return result.map((row) => ({
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    amount: toNumber(row.amount),
    description: row.description ?? '',
    date: row.date,
    category: row.category,
    merchantName: row.merchant_name,
    classification: row.classification,
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

export async function queryTransactions(_userId: string): Promise<FinanceTransaction[]> {
  return queryTransactionsByContract({
    userId: _userId,
  });
}

export async function queryTransactionsByContract(
  input: Omit<Partial<FinanceTransactionQueryContract>, 'userId'> & { userId: string },
): Promise<FinanceTransaction[]> {
  const parsed = financeTransactionQueryContractSchema.parse({
    userId: input.userId,
    accountId: input.accountId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    limit: input.limit ?? 50,
    offset: input.offset ?? 0,
    tagIds: input.tagIds,
    tagNames: input.tagNames,
  });

  const tagIds = parsed.tagIds ?? [];
  const tagNames = parsed.tagNames ?? [];
  let query = db
    .selectFrom('finance_transactions as t')
    .selectAll()
    .where('t.user_id', '=', parsed.userId);

  if (parsed.accountId) {
    query = query.where('t.account_id', '=', parsed.accountId);
  }
  if (parsed.dateFrom) {
    query = query.where('t.date', '>=', parsed.dateFrom);
  }
  if (parsed.dateTo) {
    query = query.where('t.date', '<=', parsed.dateTo);
  }
  if (tagIds.length > 0 && tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (
        select 1
        from tagged_items ti_filter
        join tags tg_filter
          on tg_filter.id = ti_filter.tag_id
         and tg_filter.owner_id = ${parsed.userId}
        where ti_filter.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
          and ti_filter.entity_id = t.id
          and (
            ti_filter.tag_id in (${sqlValueList(tagIds)})
            or tg_filter.name in (${sqlValueList(tagNames)})
          )
      )`,
    );
  } else if (tagIds.length > 0) {
    query = query.where(
      sql<boolean>`exists (
        select 1
        from tagged_items ti_filter
        join tags tg_filter
          on tg_filter.id = ti_filter.tag_id
         and tg_filter.owner_id = ${parsed.userId}
        where ti_filter.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
          and ti_filter.entity_id = t.id
          and ti_filter.tag_id in (${sqlValueList(tagIds)})
      )`,
    );
  } else if (tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (
        select 1
        from tagged_items ti_filter
        join tags tg_filter
          on tg_filter.id = ti_filter.tag_id
         and tg_filter.owner_id = ${parsed.userId}
        where ti_filter.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
          and ti_filter.entity_id = t.id
          and tg_filter.name in (${sqlValueList(tagNames)})
      )`,
    );
  }

  const result = await query
    .orderBy('t.date', 'desc')
    .orderBy('t.id', 'desc')
    .limit(parsed.limit)
    .offset(parsed.offset)
    .execute();
  return result.map(toFinanceTransaction);
}

export async function replaceTransactionTags(
  transactionId: string,
  userId: string,
  tagIds: string[],
): Promise<string[]> {
  const ownershipResult = await db
    .selectFrom('finance_transactions')
    .select('id')
    .where('id', '=', transactionId)
    .where('user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();
  if (!ownershipResult) {
    return [];
  }

  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length > 0) {
    const validTagResult = await db
      .selectFrom('tags')
      .select('id')
      .where('owner_id', '=', userId)
      .where(sql<boolean>`id in (${sqlValueList(uniqueTagIds)})`)
      .execute();
    const validIds = new Set((validTagResult as Array<{ id: string }>).map((row) => row.id));
    if (validIds.size !== uniqueTagIds.length) {
      throw new Error('One or more tags are invalid for this user');
    }
  }

  await db
    .deleteFrom('tagged_items')
    .where('entity_type', '=', FINANCE_TRANSACTION_ENTITY_TYPE)
    .where('entity_id', '=', transactionId)
    .execute();

  for (const tagId of uniqueTagIds) {
    await db
      .insertInto('tagged_items')
      .values({
        id: crypto.randomUUID(),
        tag_id: tagId,
        entity_type: FINANCE_TRANSACTION_ENTITY_TYPE,
        entity_id: transactionId,
      })
      .execute();
  }

  return uniqueTagIds;
}

export async function getTransactionTagIds(
  transactionId: string,
  userId: string,
): Promise<string[]> {
  const result = await db
    .selectFrom('tagged_items as ti')
    .innerJoin('tags as tg', (join) =>
      join.onRef('tg.id', '=', 'ti.tag_id').on('tg.owner_id', '=', userId),
    )
    .select('ti.tag_id')
    .where('ti.entity_type', '=', FINANCE_TRANSACTION_ENTITY_TYPE)
    .where('ti.entity_id', '=', transactionId)
    .orderBy('ti.tag_id', 'asc')
    .execute();
  return (result as Array<{ tag_id: string }>).map((row) => row.tag_id);
}

export async function createTransaction(
  input: Omit<FinanceTransaction, 'id'> & { id?: string },
): Promise<FinanceTransaction> {
  const id = input.id ?? crypto.randomUUID();
  const transactionType = input.amount < 0 ? 'expense' : 'income';

  const result = await db
    .insertInto('finance_transactions')
    .values({
      id,
      user_id: input.userId,
      account_id: input.accountId,
      amount: input.amount,
      transaction_type: transactionType,
      description: input.description,
      category: input.category ?? null,
      merchant_name: input.merchantName ?? null,
      date: input.date,
    })
    .returningAll()
    .executeTakeFirst();

  if (!result) {
    throw new Error('Failed to create transaction');
  }
  return toFinanceTransaction(result);
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: Partial<FinanceTransaction>,
): Promise<FinanceTransaction | null> {
  const existingResult = await db
    .selectFrom('finance_transactions')
    .selectAll()
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();
  const existing = existingResult ?? null;
  if (!existing) {
    return null;
  }

  const nextAmount = input.amount ?? toNumber(existing.amount);
  const nextDescription =
    input.description === undefined ? existing.description : input.description;
  const nextDate = input.date ?? existing.date;
  const nextAccountId = input.accountId ?? existing.account_id;
  const nextCategory = input.category === undefined ? existing.category : input.category;
  const nextMerchantName =
    input.merchantName === undefined ? existing.merchant_name : input.merchantName;
  const nextType = nextAmount < 0 ? 'expense' : 'income';

  const updateResult = await db
    .updateTable('finance_transactions')
    .set({
      amount: nextAmount,
      description: nextDescription,
      date: nextDate,
      account_id: nextAccountId,
      category: nextCategory,
      merchant_name: nextMerchantName,
      transaction_type: nextType,
    })
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .returningAll()
    .executeTakeFirst();
  const updated = updateResult ?? null;
  return updated ? toFinanceTransaction(updated) : null;
}

export async function deleteTransaction(id: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .deleteFrom('finance_transactions')
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return getAffectedRows(result) > 0;
  }

  const result = await db
    .deleteFrom('finance_transactions')
    .where('id', '=', id)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function getPlaidItemByUserAndItemId(
  _userId: string,
  _itemId: string,
): Promise<PlaidItem | null> {
  const result = await db
    .selectFrom('plaid_items')
    .selectAll()
    .where('user_id', '=', _userId)
    .where('item_id', '=', _itemId)
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    institutionId: row.institution_id,
    transactionsCursor: row.cursor,
    accessToken: row.access_token,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
  };
}

export async function getPlaidItemById(_id: string, _userId?: string): Promise<PlaidItem | null> {
  if (_userId) {
    const result = await db
      .selectFrom('plaid_items')
      .selectAll()
      .where('id', '=', _id)
      .where('user_id', '=', _userId)
      .limit(1)
      .executeTakeFirst();
    const row = result ?? null;
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      userId: row.user_id,
      itemId: row.item_id,
      institutionId: row.institution_id,
      transactionsCursor: row.cursor,
      accessToken: row.access_token,
      status: row.status,
      lastSyncedAt: row.last_synced_at,
    };
  }

  const result = await db
    .selectFrom('plaid_items')
    .selectAll()
    .where('id', '=', _id)
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    institutionId: row.institution_id,
    transactionsCursor: row.cursor,
    accessToken: row.access_token,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
  };
}

export async function getPlaidItemByItemId(_itemId: string): Promise<PlaidItem | null> {
  const result = await db
    .selectFrom('plaid_items')
    .selectAll()
    .where('item_id', '=', _itemId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    institutionId: row.institution_id,
    transactionsCursor: row.cursor,
    accessToken: row.access_token,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
  };
}

export async function ensureInstitutionExists(name: string): Promise<Institution> {
  const existing = await db
    .selectFrom('financial_institutions')
    .selectAll()
    .where('name', '=', name)
    .limit(1)
    .executeTakeFirst();
  const existingRow = existing ?? null;
  if (existingRow) {
    return existingRow as Institution;
  }
  return createInstitution(name);
}

export async function upsertPlaidItem(
  input: PlaidItem & { accessToken?: string | null },
): Promise<PlaidItem> {
  const existingResult = await db
    .selectFrom('plaid_items')
    .selectAll()
    .where('item_id', '=', input.itemId)
    .where('user_id', '=', input.userId)
    .limit(1)
    .executeTakeFirst();
  const existing = existingResult ?? null;

  if (existing) {
    const updatedResult = await db
      .updateTable('plaid_items')
      .set({
        institution_id: input.institutionId ?? null,
        cursor: input.transactionsCursor ?? null,
        access_token: input.accessToken ?? null,
        status: input.status ?? 'healthy',
        last_synced_at: input.lastSyncedAt ?? null,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirst();
    const updated = updatedResult ?? null;
    if (!updated) {
      throw new Error('Failed to update plaid item');
    }
    return {
      id: updated.id,
      userId: updated.user_id,
      itemId: updated.item_id,
      institutionId: updated.institution_id,
      transactionsCursor: updated.cursor,
      accessToken: updated.access_token,
      status: updated.status,
      lastSyncedAt: updated.last_synced_at,
    };
  }

  const createdResult = await db
    .insertInto('plaid_items')
    .values({
      id: input.id ?? crypto.randomUUID(),
      user_id: input.userId,
      item_id: input.itemId,
      institution_id: input.institutionId ?? null,
      cursor: input.transactionsCursor ?? null,
      access_token: input.accessToken ?? null,
      status: input.status ?? 'healthy',
      last_synced_at: input.lastSyncedAt ?? null,
    })
    .returningAll()
    .executeTakeFirst();
  const created = createdResult ?? null;
  if (!created) {
    throw new Error('Failed to create plaid item');
  }
  return {
    id: created.id,
    userId: created.user_id,
    itemId: created.item_id,
    institutionId: created.institution_id,
    transactionsCursor: created.cursor,
    accessToken: created.access_token,
    status: created.status,
    lastSyncedAt: created.last_synced_at,
  };
}

export async function updatePlaidItemStatusByItemId(
  userId: string,
  itemId: string,
  status: string,
): Promise<boolean> {
  const result = await db
    .updateTable('plaid_items')
    .set({
      status,
      updated_at: new Date().toISOString(),
    })
    .where('user_id', '=', userId)
    .where('item_id', '=', itemId)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function updatePlaidItemStatusById(
  id: string,
  userId: string,
  status: string,
): Promise<boolean> {
  const result = await db
    .updateTable('plaid_items')
    .set({
      status,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function updatePlaidItemCursor(id: string, cursor: string | null): Promise<boolean> {
  const result = await db
    .updateTable('plaid_items')
    .set({
      cursor,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function updatePlaidItemSyncStatus(
  id: string,
  status: string,
  error?: string | null,
): Promise<boolean> {
  const result = await db
    .updateTable('plaid_items')
    .set({
      status,
      error: error ?? null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function updatePlaidItemError(id: string, error: string | null): Promise<boolean> {
  const result = await db
    .updateTable('plaid_items')
    .set({
      error,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function deletePlaidItem(id: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .deleteFrom('plaid_items')
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return getAffectedRows(result) > 0;
  }

  const result = await db.deleteFrom('plaid_items').where('id', '=', id).executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function upsertAccount(
  input: Partial<FinanceAccount> & { userId: string },
): Promise<FinanceAccount> {
  if (!input.name) {
    throw new Error('upsertAccount requires name');
  }

  if (input.plaidAccountId) {
    const existingResult = await db
      .selectFrom('finance_accounts')
      .selectAll()
      .where('user_id', '=', input.userId)
      .where(sql<boolean>`data ->> 'plaidAccountId' = ${input.plaidAccountId}`)
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
    .selectFrom('finance_accounts')
    .selectAll()
    .where('user_id', '=', userId)
    .where(sql<boolean>`data ->> 'plaidItemId' = ${itemId}`)
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
      .selectFrom('finance_accounts')
      .selectAll()
      .where('user_id', '=', userId)
      .where(sql<boolean>`data ->> 'plaidAccountId' = ${plaidAccountId}`)
      .limit(1)
      .executeTakeFirst();
    const row = result ?? null;
    return row ? toFinanceAccount(row) : null;
  }

  const result = await db
    .selectFrom('finance_accounts')
    .selectAll()
    .where(sql<boolean>`data ->> 'plaidAccountId' = ${plaidAccountId}`)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceAccount(row) : null;
}

export async function insertTransaction(input: {
  id?: string;
  userId: string;
  accountId: string;
  type?: string;
  amount: number | string;
  description: string | null;
  date: string | Date;
  merchantName?: string | null;
  category?: string | null;
  parentCategory?: string | null;
  pending?: boolean;
  paymentChannel?: string | null;
  location?: { lat: number; lon: number } | null;
  plaidTransactionId?: string;
}): Promise<FinanceTransaction> {
  const amount = typeof input.amount === 'string' ? Number.parseFloat(input.amount) : input.amount;
  const date = input.date instanceof Date ? input.date.toISOString().slice(0, 10) : input.date;
  const transactionType = amount < 0 ? 'expense' : 'income';
  const id = input.id ?? crypto.randomUUID();

  const result = await db
    .insertInto('finance_transactions')
    .values({
      id,
      user_id: input.userId,
      account_id: input.accountId,
      amount,
      transaction_type: transactionType,
      description: input.description,
      merchant_name: input.merchantName ?? null,
      category: input.category ?? null,
      date,
      pending: input.pending ?? false,
      source: input.paymentChannel ?? null,
      external_id: input.plaidTransactionId ?? null,
    })
    .returningAll()
    .executeTakeFirst();

  if (!result) {
    throw new Error('Failed to insert transaction');
  }
  return toFinanceTransaction(result);
}

export async function getTransactionByPlaidId(
  plaidTransactionId: string,
  userId?: string,
): Promise<FinanceTransaction | null> {
  if (userId) {
    const result = await db
      .selectFrom('finance_transactions')
      .selectAll()
      .where('external_id', '=', plaidTransactionId)
      .where('user_id', '=', userId)
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst();
    const row = result ?? null;
    return row ? toFinanceTransaction(row) : null;
  }

  const result = await db
    .selectFrom('finance_transactions')
    .selectAll()
    .where('external_id', '=', plaidTransactionId)
    .orderBy('date', 'desc')
    .orderBy('id', 'desc')
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceTransaction(row) : null;
}

export async function processTransactionsFromCSVBuffer(_input: {
  userId: string;
  accountId: string;
  csvBuffer: ArrayBuffer | Buffer;
}): Promise<{ imported: number; skipped: number }> {
  return { imported: 0, skipped: 0 };
}

export async function updatePlaidTransaction(
  id: string,
  updates: Partial<{
    type: string;
    amount: number | string;
    description: string | null;
    date: string | Date;
    merchantName: string | null;
    category: string | null;
    parentCategory: string | null;
    pending: boolean;
  }>,
): Promise<FinanceTransaction | null> {
  const existingResult = await db
    .selectFrom('finance_transactions')
    .selectAll()
    .where('id', '=', id)
    .limit(1)
    .executeTakeFirst();
  const existing = existingResult ?? null;
  if (!existing) {
    return null;
  }

  const nextAmount =
    updates.amount === undefined
      ? toNumber(existing.amount)
      : typeof updates.amount === 'string'
        ? Number.parseFloat(updates.amount)
        : updates.amount;
  const nextDescription =
    updates.description === undefined ? existing.description : updates.description;
  const nextDate =
    updates.date === undefined
      ? existing.date
      : updates.date instanceof Date
        ? updates.date.toISOString().slice(0, 10)
        : updates.date;
  const nextCategory = updates.category === undefined ? existing.category : updates.category;
  const nextMerchantName =
    updates.merchantName === undefined ? existing.merchant_name : updates.merchantName;
  const nextType = nextAmount < 0 ? 'expense' : 'income';

  const result = await db
    .updateTable('finance_transactions')
    .set({
      amount: nextAmount,
      description: nextDescription,
      date: nextDate,
      category: nextCategory,
      merchant_name: nextMerchantName,
      transaction_type: nextType,
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceTransaction(row) : null;
}

export async function deletePlaidTransaction(plaidTransactionId: string): Promise<boolean> {
  const result = await db
    .deleteFrom('finance_transactions')
    .where('external_id', '=', plaidTransactionId)
    .executeTakeFirst();
  return !!result;
}
