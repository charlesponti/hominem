import crypto from 'node:crypto';

import { db, sql } from '@hominem/db';
import * as z from 'zod';

import type { FinanceTransactionQueryContract } from './contracts';
import {
  FINANCE_TRANSACTION_ENTITY_TYPE,
  financeTransactionQueryContractSchema,
} from './contracts';

interface FinanceAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  balance: number;
  plaidAccountId?: string | null;
}

interface FinanceAccountRow {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  balance: string | number | null;
  data: Record<string, unknown> | null;
}

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

interface FinanceTransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  amount: string | number;
  description: string | null;
  date: string;
  external_id: string | null;
  category: string | null;
  merchant_name: string | null;
}

interface FinanceAnalyticsTransaction extends FinanceTransaction {
  classification: string;
}

interface FinanceAnalyticsTransactionRow extends FinanceTransactionRow {
  classification: string;
}

interface TagCategoryRow {
  id: string;
  owner_id: string;
  name: string;
  color: string | null;
}

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

interface PlaidItemRow {
  id: string;
  user_id: string;
  item_id: string;
  institution_id: string | null;
  cursor: string | null;
  access_token: string | null;
  status: string | null;
  last_synced_at: string | null;
}

interface Institution {
  id: string;
  name: string;
}

function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows as T[];
    }
  }
  return [];
}

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

function toFinanceAccount(row: FinanceAccountRow): FinanceAccount {
  const data = row.data ?? {};
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
    date: row.date,
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
  const result = await db.execute(sql`
    select to_regclass(${`public.${tableName}`}) as relation_name
  `);
  const row = resultRows<{ relation_name: string | null }>(result)[0] ?? null;
  return Boolean(row?.relation_name);
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

export const calculateLoanDetailsInputSchema = z.object({
  principal: z.number().positive(),
  annualRate: z.number().nonnegative(),
  months: z.number().int().positive(),
});

export function generateTimeSeriesData(): Array<{ bucket: string; value: number }> {
  return [];
}

export function summarizeByMonth(): Array<{ month: string; amount: number }> {
  return [];
}

export function calculateTransactions(): { count: number; total: number } {
  return { count: 0, total: 0 };
}

export function getMonthlyStats(): Array<{ month: string; income: number; expenses: number }> {
  return [];
}

export function calculateBudgetBreakdown(
  input: z.infer<typeof calculateBudgetBreakdownInputSchema>,
): {
  housing: number;
  food: number;
  transportation: number;
  utilities: number;
  healthcare: number;
  entertainment: number;
  savings: number;
} {
  const savings = input.savingsTarget ?? 0;
  const remaining = Math.max(0, input.monthlyIncome - savings);
  return {
    housing: remaining * 0.3,
    food: remaining * 0.12,
    transportation: remaining * 0.1,
    utilities: remaining * 0.06,
    healthcare: remaining * 0.05,
    entertainment: remaining * 0.05,
    savings,
  };
}

export function calculateSavingsGoal(input: z.infer<typeof calculateSavingsGoalInputSchema>): {
  monthsToGoal: number;
  completionDate: string;
  totalInterestEarned: number;
} {
  if (input.currentSavings >= input.goalAmount) {
    return {
      monthsToGoal: 0,
      completionDate: new Date().toISOString(),
      totalInterestEarned: 0,
    };
  }
  const principalGap = input.goalAmount - input.currentSavings;
  const monthsToGoal = Math.ceil(principalGap / input.monthlyContribution);
  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + monthsToGoal);
  const annualRate = input.interestRate ?? 0;
  const monthlyRate = annualRate / 100 / 12;
  const totalContributed = monthsToGoal * input.monthlyContribution;
  const totalInterestEarned = Math.max(0, totalContributed * monthlyRate * (monthsToGoal / 2));
  return {
    monthsToGoal,
    completionDate: completionDate.toISOString(),
    totalInterestEarned,
  };
}

export function calculateLoanDetails(input: z.infer<typeof calculateLoanDetailsInputSchema>): {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
} {
  if (input.annualRate === 0) {
    const monthlyPayment = input.principal / input.months;
    return {
      monthlyPayment,
      totalPayment: monthlyPayment * input.months,
      totalInterest: 0,
    };
  }
  const monthlyRate = input.annualRate / 100 / 12;
  const denominator = 1 - Math.pow(1 + monthlyRate, -input.months);
  const monthlyPayment = (input.principal * monthlyRate) / denominator;
  const totalPayment = monthlyPayment * input.months;
  return {
    monthlyPayment,
    totalPayment,
    totalInterest: totalPayment - input.principal,
  };
}

export async function deleteAllFinanceData(userId: string): Promise<void> {
  await deleteAllFinanceDataWithSummary(userId);
}

export async function deleteAllFinanceDataWithSummary(userId: string): Promise<{
  deletedTaggedItems: number;
  deletedTransactions: number;
  deletedAccounts: number;
  deletedBudgetGoals: number;
  deletedPlaidItems: number;
}> {
  const taggedItemsResult = await db.execute(sql`
    with deleted as (
      delete from tagged_items
      where entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
        and entity_id in (select id from finance_transactions where user_id = ${userId})
      returning 1
    )
    select count(*)::int as total from deleted
  `);
  const deletedTaggedItems = resultRows<{ total: number }>(taggedItemsResult)[0]?.total ?? 0;

  const transactionsResult = await db.execute(sql`
    with deleted as (
      delete from finance_transactions where user_id = ${userId} returning 1
    )
    select count(*)::int as total from deleted
  `);
  const deletedTransactions = resultRows<{ total: number }>(transactionsResult)[0]?.total ?? 0;

  const accountsResult = await db.execute(sql`
    with deleted as (
      delete from finance_accounts where user_id = ${userId} returning 1
    )
    select count(*)::int as total from deleted
  `);
  const deletedAccounts = resultRows<{ total: number }>(accountsResult)[0]?.total ?? 0;

  let deletedBudgetGoals = 0;
  if (await tableExists('budget_goals')) {
    const budgetGoalsResult = await db.execute(sql`
      with deleted as (
        delete from budget_goals where user_id = ${userId} returning 1
      )
      select count(*)::int as total from deleted
    `);
    deletedBudgetGoals = resultRows<{ total: number }>(budgetGoalsResult)[0]?.total ?? 0;
  }

  let deletedPlaidItems = 0;
  if (await tableExists('plaid_items')) {
    const plaidItemsResult = await db.execute(sql`
      with deleted as (
        delete from plaid_items where user_id = ${userId} returning 1
      )
      select count(*)::int as total from deleted
    `);
    deletedPlaidItems = resultRows<{ total: number }>(plaidItemsResult)[0]?.total ?? 0;
  }

  return {
    deletedTaggedItems,
    deletedTransactions,
    deletedAccounts,
    deletedBudgetGoals,
    deletedPlaidItems,
  };
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
    const budgetGoalsResult = await db.execute(sql`
      select id, category_id, target_amount, target_period
      from budget_goals
      where user_id = ${userId}
      order by created_at desc, id asc
    `);
    budgetGoals = resultRows<{
      id: string;
      category_id: string | null;
      target_amount: string | number;
      target_period: string;
    }>(budgetGoalsResult).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      targetAmount: toNumber(row.target_amount),
      targetPeriod: row.target_period,
    }));
  }

  let plaidItems: PlaidItem[] = [];
  if (await tableExists('plaid_items')) {
    plaidItems = await listPlaidConnectionsForUser(userId);
  }

  return {
    accounts,
    transactions,
    tags,
    budgetGoals,
    plaidItems,
  };
}

export async function createAccount(input: Partial<FinanceAccount>): Promise<FinanceAccount> {
  if (!input.userId || !input.name) {
    throw new Error('createAccount requires userId and name');
  }

  const id = input.id ?? crypto.randomUUID();
  const accountType = input.type ?? 'cash';
  const balance = input.balance ?? 0;
  const data: Record<string, unknown> = {};
  if (input.plaidAccountId) {
    data.plaidAccountId = input.plaidAccountId;
  }

  const result = await db.execute(sql`
    insert into finance_accounts (id, user_id, name, account_type, balance, data)
    values (${id}, ${input.userId}, ${input.name}, ${accountType}, ${balance}, ${JSON.stringify(data)}::jsonb)
    returning id, user_id, name, account_type, balance, data
  `);

  const row = resultRows<FinanceAccountRow>(result)[0] ?? null;
  if (!row) {
    throw new Error('Failed to create account');
  }

  return toFinanceAccount(row);
}

export async function listAccounts(userId: string): Promise<FinanceAccount[]> {
  const result = await db.execute(sql`
    select id, user_id, name, account_type, balance, data
    from finance_accounts
    where user_id = ${userId}
    order by name asc, id asc
  `);
  return resultRows<FinanceAccountRow>(result).map(toFinanceAccount);
}

export async function getAccountById(
  accountId: string,
  userId?: string,
): Promise<FinanceAccount | null> {
  if (userId) {
    const result = await db.execute(sql`
      select id, user_id, name, account_type, balance, data
      from finance_accounts
      where id = ${accountId}
        and user_id = ${userId}
      limit 1
    `);
    const row = resultRows<FinanceAccountRow>(result)[0] ?? null;
    return row ? toFinanceAccount(row) : null;
  }

  const result = await db.execute(sql`
    select id, user_id, name, account_type, balance, data
    from finance_accounts
    where id = ${accountId}
    limit 1
  `);
  const row = resultRows<FinanceAccountRow>(result)[0] ?? null;
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

  const result = await db.execute(sql`
    update finance_accounts
    set
      name = ${nextName},
      account_type = ${nextType},
      balance = ${nextBalance},
      data = ${JSON.stringify(nextData)}::jsonb,
      updated_at = now()
    where id = ${input.id}
      and user_id = ${existing.userId}
    returning id, user_id, name, account_type, balance, data
  `);

  const row = resultRows<FinanceAccountRow>(result)[0] ?? null;
  return row ? toFinanceAccount(row) : null;
}

export async function deleteAccount(accountId: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db.execute(sql`
      delete from finance_accounts
      where id = ${accountId}
        and user_id = ${userId}
      returning id
    `);
    return Boolean(resultRows<{ id: string }>(result)[0]);
  }

  const result = await db.execute(sql`
    delete from finance_accounts
    where id = ${accountId}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
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
  const result = await db.execute(sql`
    select id, user_id, item_id, institution_id, cursor, access_token, status, last_synced_at
    from plaid_items
    where user_id = ${userId}
    order by created_at desc, id asc
  `);

  return resultRows<PlaidItemRow>(result).map((row) => ({
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
  const result = await db.execute(sql`
    select id, user_id, name, account_type, balance, data
    from finance_accounts
    where user_id = ${userId}
      and institution_id = ${institutionId}
    order by name asc, id asc
  `);
  return resultRows<FinanceAccountRow>(result).map(toFinanceAccount);
}

export async function getTransactionTagAnalysis(
  _userId: string,
): Promise<Array<{ tag: string; total: number }>> {
  return getTagBreakdown(_userId);
}

export async function bulkCreateBudgetCategoriesFromTransactions(
  _userId: string,
): Promise<FinanceCategory[]> {
  const txCategoryResult = await db.execute(sql`
    select distinct category
    from finance_transactions
    where user_id = ${_userId}
      and category is not null
      and category <> ''
    order by category asc
  `);
  const discovered = resultRows<{ category: string }>(txCategoryResult).map((row) => row.category);
  if (discovered.length === 0) {
    return [];
  }

  const existingResult = await db.execute(sql`
    select name
    from tags
    where owner_id = ${_userId}
  `);
  const existingNames = new Set(
    resultRows<{ name: string }>(existingResult).map((row) => row.name.toLowerCase()),
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
  const result = await db.execute(sql`
    select id, owner_id, name, color
    from tags
    where owner_id = ${_userId}
    order by name asc, id asc
  `);
  return resultRows<TagCategoryRow>(result).map(toFinanceCategoryFromTag);
}

export async function getTransactionTags(userId: string): Promise<FinanceCategory[]> {
  return getSpendingCategories(userId);
}

export async function createBudgetCategory(
  input: Partial<FinanceCategory> & { userId: string; name: string },
): Promise<FinanceCategory> {
  const id = input.id ?? crypto.randomUUID();
  const result = await db.execute(sql`
    insert into tags (id, owner_id, name, color, description)
    values (
      ${id},
      ${input.userId},
      ${input.name},
      ${input.color ?? null},
      ${input.icon ?? null}
    )
    returning id, owner_id, name, color
  `);
  const row = resultRows<TagCategoryRow>(result)[0] ?? null;
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
  const existingResult = await db.execute(sql`
    select id, owner_id, name, color
    from tags
    where id = ${id}
      and owner_id = ${userId}
    limit 1
  `);
  const existing = resultRows<TagCategoryRow>(existingResult)[0] ?? null;
  if (!existing) {
    return null;
  }

  const result = await db.execute(sql`
    update tags
    set
      name = ${input.name ?? existing.name},
      color = ${input.color === undefined ? existing.color : input.color}
    where id = ${id}
      and owner_id = ${userId}
    returning id, owner_id, name, color
  `);
  const row = resultRows<TagCategoryRow>(result)[0] ?? null;
  return row ? toFinanceCategoryFromTag(row) : null;
}

export async function deleteBudgetCategory(id: string, userId: string): Promise<boolean> {
  const result = await db.execute(sql`
    delete from tags
    where id = ${id}
      and owner_id = ${userId}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function getBudgetCategoryById(
  id: string,
  userId: string,
): Promise<FinanceCategory | null> {
  const result = await db.execute(sql`
    select id, owner_id, name, color
    from tags
    where id = ${id}
      and owner_id = ${userId}
    limit 1
  `);
  const row = resultRows<TagCategoryRow>(result)[0] ?? null;
  return row ? toFinanceCategoryFromTag(row) : null;
}

export async function checkBudgetCategoryNameExists(
  userId: string,
  name: string,
): Promise<boolean> {
  const result = await db.execute(sql`
    select id
    from tags
    where owner_id = ${userId}
      and name = ${name}
    limit 1
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function getUserExpenseCategories(userId: string): Promise<FinanceCategory[]> {
  return getAllBudgetCategories(userId);
}

export async function getAllBudgetCategories(userId: string): Promise<FinanceCategory[]> {
  const result = await db.execute(sql`
    select id, owner_id, name, color
    from tags
    where owner_id = ${userId}
    order by name asc, id asc
  `);
  return resultRows<TagCategoryRow>(result).map(toFinanceCategoryFromTag);
}

export async function getBudgetCategoriesWithSpending(
  userId: string,
): Promise<Array<FinanceCategory & { spent: number }>> {
  const result = await db.execute(sql`
    select
      tg.id,
      tg.owner_id,
      tg.name,
      tg.color,
      coalesce(sum(abs(t.amount)), 0) as spent
    from tags tg
    left join tagged_items ti
      on ti.tag_id = tg.id
      and ti.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
    left join finance_transactions t
      on t.id = ti.entity_id
      and t.user_id = tg.owner_id
      and t.transaction_type = 'expense'
    where tg.owner_id = ${userId}
    group by tg.id, tg.owner_id, tg.name, tg.color
    order by tg.name asc, tg.id asc
  `);

  return resultRows<TagCategoryRow & { spent: string | number }>(result).map((row) => ({
    ...toFinanceCategoryFromTag(row),
    spent: toNumber(row.spent),
  }));
}

export async function getBudgetTrackingData(
  userId: string,
): Promise<{ totalBudget: number; totalSpent: number }> {
  const spentResult = await db.execute(sql`
    select coalesce(sum(abs(amount)), 0) as total_spent
    from finance_transactions
    where user_id = ${userId}
      and transaction_type = 'expense'
  `);
  const spentRow = resultRows<{ total_spent: string | number }>(spentResult)[0] ?? null;
  const totalSpent = spentRow ? toNumber(spentRow.total_spent) : 0;

  const hasBudgetGoals = await tableExists('budget_goals');
  if (!hasBudgetGoals) {
    return { totalBudget: 0, totalSpent };
  }

  const budgetResult = await db.execute(sql`
    select coalesce(sum(target_amount), 0) as total_budget
    from budget_goals
    where user_id = ${userId}
  `);
  const budgetRow = resultRows<{ total_budget: string | number }>(budgetResult)[0] ?? null;
  return {
    totalBudget: budgetRow ? toNumber(budgetRow.total_budget) : 0,
    totalSpent,
  };
}

export async function getAllInstitutions(): Promise<Institution[]> {
  const result = await db.execute(sql`
    select id, name
    from financial_institutions
    order by name asc, id asc
  `);
  return resultRows<Institution>(result);
}

export async function createInstitution(name: string): Promise<Institution> {
  const result = await db.execute(sql`
    insert into financial_institutions (id, name)
    values (${crypto.randomUUID()}, ${name})
    returning id, name
  `);
  const row = resultRows<Institution>(result)[0] ?? null;
  if (!row) {
    throw new Error('Failed to create institution');
  }
  return row;
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
  const result = await db.execute(sql`
    select
      tg.name as tag,
      coalesce(sum(abs(amount)), 0) as total
    from finance_transactions t
    join tagged_items ti
      on ti.entity_id = t.id
      and ti.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
    join tags tg
      on tg.id = ti.tag_id
      and tg.owner_id = ${_userId}
    where t.user_id = ${_userId}
      and t.transaction_type = 'expense'
    group by tg.name
    order by total desc, tag asc
  `);

  return resultRows<{ tag: string; total: string | number }>(result).map((row) => ({
    tag: row.tag,
    total: toNumber(row.total),
  }));
}

export async function getTopMerchants(
  _userId: string,
): Promise<Array<{ merchant: string; total: number }>> {
  const result = await db.execute(sql`
    select
      merchant_name as merchant,
      coalesce(sum(abs(amount)), 0) as total
    from finance_transactions
    where user_id = ${_userId}
      and transaction_type = 'expense'
      and merchant_name is not null
      and merchant_name <> ''
    group by merchant_name
    order by total desc, merchant_name asc
    limit 10
  `);

  return resultRows<{ merchant: string; total: string | number }>(result).map((row) => ({
    merchant: row.merchant,
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
  const baseFilters = [sql`t.user_id = ${parsed.userId}`];
  if (parsed.accountId) {
    baseFilters.push(sql`t.account_id = ${parsed.accountId}`);
  }
  if (parsed.dateFrom) {
    baseFilters.push(sql`t.date >= ${parsed.dateFrom}`);
  }
  if (parsed.dateTo) {
    baseFilters.push(sql`t.date <= ${parsed.dateTo}`);
  }

  if (tagIds.length > 0 && tagNames.length > 0) {
    baseFilters.push(sql`
      exists (
        select 1
        from tagged_items ti_filter
        join tags tg_filter
          on tg_filter.id = ti_filter.tag_id
          and tg_filter.owner_id = ${parsed.userId}
        where ti_filter.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
          and ti_filter.entity_id = t.id
          and (ti_filter.tag_id in (${sqlValueList(tagIds)}) or tg_filter.name in (${sqlValueList(tagNames)}))
      )
    `);
  } else if (tagIds.length > 0) {
    baseFilters.push(sql`
      exists (
        select 1
        from tagged_items ti_filter
        join tags tg_filter
          on tg_filter.id = ti_filter.tag_id
          and tg_filter.owner_id = ${parsed.userId}
        where ti_filter.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
          and ti_filter.entity_id = t.id
          and ti_filter.tag_id in (${sqlValueList(tagIds)})
      )
    `);
  } else if (tagNames.length > 0) {
    baseFilters.push(sql`
      exists (
        select 1
        from tagged_items ti_filter
        join tags tg_filter
          on tg_filter.id = ti_filter.tag_id
          and tg_filter.owner_id = ${parsed.userId}
        where ti_filter.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
          and ti_filter.entity_id = t.id
          and tg_filter.name in (${sqlValueList(tagNames)})
      )
    `);
  }

  const result = await db.execute(sql`
    select
      t.id,
      t.user_id,
      t.account_id,
      t.amount,
      t.description,
      t.date,
      t.external_id,
      t.category,
      t.merchant_name,
      coalesce(
        (
          select min(tg_tag.name)
          from tagged_items ti_tag
          join tags tg_tag
            on tg_tag.id = ti_tag.tag_id
            and tg_tag.owner_id = ${parsed.userId}
          where ti_tag.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
            and ti_tag.entity_id = t.id
        ),
        t.category,
        ${'Uncategorized'}
      ) as classification
    from finance_transactions t
    where ${sql.join(baseFilters, sql` and `)}
    order by t.date desc, t.id desc
    limit ${parsed.limit}
    offset ${parsed.offset}
  `);

  return resultRows<FinanceAnalyticsTransactionRow>(result).map((row) => ({
    ...toFinanceTransaction(row),
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

  const normalizedLimit = Math.max(1, Math.floor(input.limit ?? 10));
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

  const hasTagFilters =
    (parsed.tagIds !== undefined && parsed.tagIds.length > 0) ||
    (parsed.tagNames !== undefined && parsed.tagNames.length > 0);

  const baseFilters = [sql`t.user_id = ${parsed.userId}`];
  if (parsed.accountId) {
    baseFilters.push(sql`t.account_id = ${parsed.accountId}`);
  }
  if (parsed.dateFrom) {
    baseFilters.push(sql`t.date >= ${parsed.dateFrom}`);
  }
  if (parsed.dateTo) {
    baseFilters.push(sql`t.date <= ${parsed.dateTo}`);
  }

  if (!hasTagFilters) {
    const result = await db.execute(sql`
      select t.id, t.user_id, t.account_id, t.amount, t.description, t.date, t.external_id, t.category, t.merchant_name
      from finance_transactions t
      where ${sql.join(baseFilters, sql` and `)}
      order by t.date desc, t.id desc
      limit ${parsed.limit}
      offset ${parsed.offset}
    `);
    return resultRows<FinanceTransactionRow>(result).map(toFinanceTransaction);
  }

  const tagIds = parsed.tagIds ?? [];
  const tagNames = parsed.tagNames ?? [];
  if (tagIds.length > 0 && tagNames.length > 0) {
    const filters = [
      ...baseFilters,
      sql`(ti.tag_id in (${sqlValueList(tagIds)}) or tg.name in (${sqlValueList(tagNames)}))`,
    ];
    const result = await db.execute(sql`
      select distinct on (t.date, t.id)
        t.id,
        t.user_id,
        t.account_id,
        t.amount,
        t.description,
        t.date,
        t.external_id,
        t.category,
        t.merchant_name
      from finance_transactions t
      join tagged_items ti
        on ti.entity_id = t.id
        and ti.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
      join tags tg
        on tg.id = ti.tag_id
        and tg.owner_id = ${parsed.userId}
      where ${sql.join(filters, sql` and `)}
      order by t.date desc, t.id desc
      limit ${parsed.limit}
      offset ${parsed.offset}
    `);
    return resultRows<FinanceTransactionRow>(result).map(toFinanceTransaction);
  }

  if (tagIds.length > 0) {
    const filters = [...baseFilters, sql`ti.tag_id in (${sqlValueList(tagIds)})`];
    const result = await db.execute(sql`
      select distinct on (t.date, t.id)
        t.id,
        t.user_id,
        t.account_id,
        t.amount,
        t.description,
        t.date,
        t.external_id,
        t.category,
        t.merchant_name
      from finance_transactions t
      join tagged_items ti
        on ti.entity_id = t.id
        and ti.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
      join tags tg
        on tg.id = ti.tag_id
        and tg.owner_id = ${parsed.userId}
      where ${sql.join(filters, sql` and `)}
      order by t.date desc, t.id desc
      limit ${parsed.limit}
      offset ${parsed.offset}
    `);
    return resultRows<FinanceTransactionRow>(result).map(toFinanceTransaction);
  }

  const filters = [...baseFilters, sql`tg.name in (${sqlValueList(tagNames)})`];
  const result = await db.execute(sql`
    select distinct on (t.date, t.id)
      t.id,
      t.user_id,
      t.account_id,
      t.amount,
      t.description,
      t.date,
      t.external_id,
      t.category,
      t.merchant_name
    from finance_transactions t
    join tagged_items ti
      on ti.entity_id = t.id
      and ti.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
    join tags tg
      on tg.id = ti.tag_id
      and tg.owner_id = ${parsed.userId}
    where ${sql.join(filters, sql` and `)}
    order by t.date desc, t.id desc
    limit ${parsed.limit}
    offset ${parsed.offset}
  `);
  return resultRows<FinanceTransactionRow>(result).map(toFinanceTransaction);
}

export async function replaceTransactionTags(
  transactionId: string,
  userId: string,
  tagIds: string[],
): Promise<string[]> {
  const ownershipResult = await db.execute(sql`
    select id
    from finance_transactions
    where id = ${transactionId}
      and user_id = ${userId}
    limit 1
  `);
  if (!resultRows<{ id: string }>(ownershipResult)[0]) {
    return [];
  }

  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length > 0) {
    const validTagResult = await db.execute(sql`
      select id
      from tags
      where owner_id = ${userId}
        and id in (${sqlValueList(uniqueTagIds)})
    `);
    const validIds = new Set(resultRows<{ id: string }>(validTagResult).map((row) => row.id));
    if (validIds.size !== uniqueTagIds.length) {
      throw new Error('One or more tags are invalid for this user');
    }
  }

  await db.execute(sql`
    delete from tagged_items
    where entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
      and entity_id = ${transactionId}
  `);

  for (const tagId of uniqueTagIds) {
    await db.execute(sql`
      insert into tagged_items (id, tag_id, entity_type, entity_id)
      values (${crypto.randomUUID()}, ${tagId}, ${FINANCE_TRANSACTION_ENTITY_TYPE}, ${transactionId})
    `);
  }

  return uniqueTagIds;
}

export async function getTransactionTagIds(
  transactionId: string,
  userId: string,
): Promise<string[]> {
  const result = await db.execute(sql`
    select ti.tag_id
    from tagged_items ti
    join tags tg
      on tg.id = ti.tag_id
      and tg.owner_id = ${userId}
    where ti.entity_type = ${FINANCE_TRANSACTION_ENTITY_TYPE}
      and ti.entity_id = ${transactionId}
    order by ti.tag_id asc
  `);
  return resultRows<{ tag_id: string }>(result).map((row) => row.tag_id);
}

export async function createTransaction(
  input: Omit<FinanceTransaction, 'id'> & { id?: string },
): Promise<FinanceTransaction> {
  const id = input.id ?? crypto.randomUUID();
  const transactionType = input.amount < 0 ? 'expense' : 'income';

  const result = await db.execute(sql`
    insert into finance_transactions (
      id,
      user_id,
      account_id,
      amount,
      transaction_type,
      description,
      category,
      merchant_name,
      date
    )
    values (
      ${id},
      ${input.userId},
      ${input.accountId},
      ${input.amount},
      ${transactionType},
      ${input.description},
      ${input.category ?? null},
      ${input.merchantName ?? null},
      ${input.date}
    )
    returning id, user_id, account_id, amount, description, date, external_id, category, merchant_name
  `);

  const row = resultRows<FinanceTransactionRow>(result)[0] ?? null;
  if (!row) {
    throw new Error('Failed to create transaction');
  }
  return toFinanceTransaction(row);
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: Partial<FinanceTransaction>,
): Promise<FinanceTransaction | null> {
  const existingResult = await db.execute(sql`
    select id, user_id, account_id, amount, description, date, external_id, category, merchant_name
    from finance_transactions
    where id = ${id}
      and user_id = ${userId}
    limit 1
  `);
  const existing = resultRows<FinanceTransactionRow>(existingResult)[0] ?? null;
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

  const updateResult = await db.execute(sql`
    update finance_transactions
    set
      amount = ${nextAmount},
      description = ${nextDescription},
      date = ${nextDate},
      account_id = ${nextAccountId},
      category = ${nextCategory},
      merchant_name = ${nextMerchantName},
      transaction_type = ${nextType}
    where id = ${id}
      and user_id = ${userId}
    returning id, user_id, account_id, amount, description, date, external_id, category, merchant_name
  `);
  const updated = resultRows<FinanceTransactionRow>(updateResult)[0] ?? null;
  return updated ? toFinanceTransaction(updated) : null;
}

export async function deleteTransaction(id: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db.execute(sql`
      delete from finance_transactions
      where id = ${id}
        and user_id = ${userId}
      returning id
    `);
    return Boolean(resultRows<{ id: string }>(result)[0]);
  }

  const result = await db.execute(sql`
    delete from finance_transactions
    where id = ${id}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function getPlaidItemByUserAndItemId(
  _userId: string,
  _itemId: string,
): Promise<PlaidItem | null> {
  const result = await db.execute(sql`
    select id, user_id, item_id, institution_id, cursor, access_token, status, last_synced_at
    from plaid_items
    where user_id = ${_userId}
      and item_id = ${_itemId}
    limit 1
  `);
  const row = resultRows<PlaidItemRow>(result)[0] ?? null;
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
    const result = await db.execute(sql`
      select id, user_id, item_id, institution_id, cursor, access_token, status, last_synced_at
      from plaid_items
      where id = ${_id}
        and user_id = ${_userId}
      limit 1
    `);
    const row = resultRows<PlaidItemRow>(result)[0] ?? null;
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

  const result = await db.execute(sql`
    select id, user_id, item_id, institution_id, cursor, access_token, status, last_synced_at
    from plaid_items
    where id = ${_id}
    limit 1
  `);
  const row = resultRows<PlaidItemRow>(result)[0] ?? null;
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
  const result = await db.execute(sql`
    select id, user_id, item_id, institution_id, cursor, access_token, status, last_synced_at
    from plaid_items
    where item_id = ${_itemId}
    order by created_at desc, id asc
    limit 1
  `);
  const row = resultRows<PlaidItemRow>(result)[0] ?? null;
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
  const existing = await db.execute(sql`
    select id, name
    from financial_institutions
    where name = ${name}
    limit 1
  `);
  const existingRow = resultRows<Institution>(existing)[0] ?? null;
  if (existingRow) {
    return existingRow;
  }
  return createInstitution(name);
}

export async function upsertPlaidItem(
  input: PlaidItem & { accessToken?: string | null },
): Promise<PlaidItem> {
  const existingResult = await db.execute(sql`
    select id, user_id, item_id, institution_id, cursor, access_token, status, last_synced_at
    from plaid_items
    where item_id = ${input.itemId}
      and user_id = ${input.userId}
    limit 1
  `);
  const existing =
    resultRows<{
      id: string;
      user_id: string;
      item_id: string;
      institution_id: string | null;
      cursor: string | null;
      access_token: string | null;
      status: string | null;
      last_synced_at: string | null;
    }>(existingResult)[0] ?? null;

  if (existing) {
    const updatedResult = await db.execute(sql`
      update plaid_items
      set
        institution_id = ${input.institutionId ?? null},
        cursor = ${input.transactionsCursor ?? null},
        access_token = ${input.accessToken ?? null},
        status = ${input.status ?? 'healthy'},
        last_synced_at = ${input.lastSyncedAt ?? null},
        updated_at = now()
      where id = ${existing.id}
      returning id, user_id, item_id, institution_id, cursor, access_token, status, last_synced_at
    `);
    const updated =
      resultRows<{
        id: string;
        user_id: string;
        item_id: string;
        institution_id: string | null;
        cursor: string | null;
        access_token: string | null;
        status: string | null;
        last_synced_at: string | null;
      }>(updatedResult)[0] ?? null;
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

  const createdResult = await db.execute(sql`
    insert into plaid_items (
      id,
      user_id,
      item_id,
      institution_id,
      cursor,
      access_token,
      status,
      last_synced_at
    )
    values (
      ${input.id ?? crypto.randomUUID()},
      ${input.userId},
      ${input.itemId},
      ${input.institutionId ?? null},
      ${input.transactionsCursor ?? null},
      ${input.accessToken ?? null},
      ${input.status ?? 'healthy'},
      ${input.lastSyncedAt ?? null}
    )
    returning id, user_id, item_id, institution_id, cursor, access_token, status, last_synced_at
  `);
  const created =
    resultRows<{
      id: string;
      user_id: string;
      item_id: string;
      institution_id: string | null;
      cursor: string | null;
      access_token: string | null;
      status: string | null;
      last_synced_at: string | null;
    }>(createdResult)[0] ?? null;
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
  const result = await db.execute(sql`
    update plaid_items
    set status = ${status}, updated_at = now()
    where user_id = ${userId}
      and item_id = ${itemId}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function updatePlaidItemStatusById(
  id: string,
  userId: string,
  status: string,
): Promise<boolean> {
  const result = await db.execute(sql`
    update plaid_items
    set status = ${status}, updated_at = now()
    where id = ${id}
      and user_id = ${userId}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function updatePlaidItemCursor(id: string, cursor: string | null): Promise<boolean> {
  const result = await db.execute(sql`
    update plaid_items
    set cursor = ${cursor}, updated_at = now()
    where id = ${id}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function updatePlaidItemSyncStatus(
  id: string,
  status: string,
  error?: string | null,
): Promise<boolean> {
  const result = await db.execute(sql`
    update plaid_items
    set
      status = ${status},
      error = ${error ?? null},
      last_synced_at = now(),
      updated_at = now()
    where id = ${id}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function updatePlaidItemError(id: string, error: string | null): Promise<boolean> {
  const result = await db.execute(sql`
    update plaid_items
    set error = ${error}, updated_at = now()
    where id = ${id}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function deletePlaidItem(id: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db.execute(sql`
      delete from plaid_items
      where id = ${id}
        and user_id = ${userId}
      returning id
    `);
    return Boolean(resultRows<{ id: string }>(result)[0]);
  }

  const result = await db.execute(sql`
    delete from plaid_items
    where id = ${id}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}

export async function upsertAccount(
  input: Partial<FinanceAccount> & { userId: string },
): Promise<FinanceAccount> {
  if (!input.name) {
    throw new Error('upsertAccount requires name');
  }

  if (input.plaidAccountId) {
    const existingResult = await db.execute(sql`
      select id, user_id, name, account_type, balance, data
      from finance_accounts
      where user_id = ${input.userId}
        and data ->> 'plaidAccountId' = ${input.plaidAccountId}
      limit 1
    `);
    const existing = resultRows<FinanceAccountRow>(existingResult)[0] ?? null;
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

  const result = await db.execute(sql`
    select id, user_id, name, account_type, balance, data
    from finance_accounts
    where user_id = ${userId}
      and data ->> 'plaidItemId' = ${itemId}
    order by name asc, id asc
  `);
  return resultRows<FinanceAccountRow>(result).map(toFinanceAccount);
}

export async function getAccountByPlaidId(
  plaidAccountId: string,
  userId?: string,
): Promise<FinanceAccount | null> {
  if (userId) {
    const result = await db.execute(sql`
      select id, user_id, name, account_type, balance, data
      from finance_accounts
      where user_id = ${userId}
        and data ->> 'plaidAccountId' = ${plaidAccountId}
      limit 1
    `);
    const row = resultRows<FinanceAccountRow>(result)[0] ?? null;
    return row ? toFinanceAccount(row) : null;
  }

  const result = await db.execute(sql`
    select id, user_id, name, account_type, balance, data
    from finance_accounts
    where data ->> 'plaidAccountId' = ${plaidAccountId}
    order by created_at desc, id asc
    limit 1
  `);
  const row = resultRows<FinanceAccountRow>(result)[0] ?? null;
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

  const result = await db.execute(sql`
    insert into finance_transactions (
      id,
      user_id,
      account_id,
      amount,
      transaction_type,
      description,
      merchant_name,
      category,
      date,
      pending,
      source,
      external_id
    )
    values (
      ${id},
      ${input.userId},
      ${input.accountId},
      ${amount},
      ${transactionType},
      ${input.description},
      ${input.merchantName ?? null},
      ${input.category ?? null},
      ${date},
      ${input.pending ?? false},
      ${input.paymentChannel ?? null},
      ${input.plaidTransactionId ?? null}
    )
    returning id, user_id, account_id, amount, description, date, external_id, category, merchant_name
  `);

  const row = resultRows<FinanceTransactionRow>(result)[0] ?? null;
  if (!row) {
    throw new Error('Failed to insert transaction');
  }
  return toFinanceTransaction(row);
}

export async function getTransactionByPlaidId(
  plaidTransactionId: string,
  userId?: string,
): Promise<FinanceTransaction | null> {
  if (userId) {
    const result = await db.execute(sql`
      select id, user_id, account_id, amount, description, date, external_id, category, merchant_name
      from finance_transactions
      where external_id = ${plaidTransactionId}
        and user_id = ${userId}
      order by date desc, id desc
      limit 1
    `);
    const row = resultRows<FinanceTransactionRow>(result)[0] ?? null;
    return row ? toFinanceTransaction(row) : null;
  }

  const result = await db.execute(sql`
    select id, user_id, account_id, amount, description, date, external_id, category, merchant_name
    from finance_transactions
    where external_id = ${plaidTransactionId}
    order by date desc, id desc
    limit 1
  `);
  const row = resultRows<FinanceTransactionRow>(result)[0] ?? null;
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
  const existingResult = await db.execute(sql`
    select id, user_id, account_id, amount, description, date, external_id, category, merchant_name
    from finance_transactions
    where id = ${id}
    limit 1
  `);
  const existing = resultRows<FinanceTransactionRow>(existingResult)[0] ?? null;
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

  const result = await db.execute(sql`
    update finance_transactions
    set
      amount = ${nextAmount},
      description = ${nextDescription},
      date = ${nextDate},
      category = ${nextCategory},
      merchant_name = ${nextMerchantName},
      transaction_type = ${nextType}
    where id = ${id}
    returning id, user_id, account_id, amount, description, date, external_id, category, merchant_name
  `);
  const row = resultRows<FinanceTransactionRow>(result)[0] ?? null;
  return row ? toFinanceTransaction(row) : null;
}

export async function deletePlaidTransaction(plaidTransactionId: string): Promise<boolean> {
  const result = await db.execute(sql`
    delete from finance_transactions
    where external_id = ${plaidTransactionId}
    returning id
  `);
  return Boolean(resultRows<{ id: string }>(result)[0]);
}
