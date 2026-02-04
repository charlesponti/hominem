import { type InferInsertModel, type InferSelectModel, sql } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import * as z from 'zod';

import {
  type Json,
  type TransactionLocation,
  TransactionLocationSchema,
  createdAtColumn,
  updatedAtColumn,
  requiredTextColumn,
  optionalTextColumn,
  requiredNumericColumn,
  optionalNumericColumn,
  requiredUuidColumn,
  optionalUuidColumn,
  booleanColumn,
  requiredTimestampColumn,
  optionalTimestampColumn,
  jsonColumn,
} from './shared.schema';
import { users } from './users.schema';

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
  'credit',
  'debit',
  'transfer',
  'investment',
] as const);
export const TransactionTypeEnum = z.enum(transactionTypeEnum.enumValues as [string, ...string[]]);

export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export const TransactionTypes = transactionTypeEnum.enumValues.reduce(
  (acc, val) => {
    acc[val] = val;
    return acc;
  },
  {} as Record<TransactionType, TransactionType>,
);

export const accountTypeEnum = pgEnum('account_type', [
  'checking',
  'savings',
  'investment',
  'credit',
  'loan',
  'retirement',
  'depository',
  'brokerage',
  'other',
]);

export const AccountTypeEnum = z.enum(accountTypeEnum.enumValues as [string, ...string[]]);

export type AccountType = (typeof accountTypeEnum.enumValues)[number];

export const institutionStatusEnum = pgEnum('institution_status', [
  'active',
  'error',
  'pending_expiration',
  'revoked',
]);

export const budgetCategoryTypeEnum = pgEnum('budget_category_type', ['income', 'expense']);
export type BudgetCategoryType = (typeof budgetCategoryTypeEnum.enumValues)[number];

// Financial institutions table
export const financialInstitutions = pgTable(
  'financial_institutions',
  {
    id: text('id').primaryKey(), // Plaid institution ID or custom ID for non-Plaid institutions
    name: requiredTextColumn('name'),
    url: optionalTextColumn('url'),
    logo: optionalTextColumn('logo'),
    primaryColor: optionalTextColumn('primary_color'),
    country: optionalTextColumn('country'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('financial_institutions_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.name})`,
    ),
  ],
);
export type FinancialInstitution = InferSelectModel<typeof financialInstitutions>;
export type FinancialInstitutionInsert = InferInsertModel<typeof financialInstitutions>;
export type FinancialInstitutionSelect = FinancialInstitution;

// Plaid items table to track connected institutions
export const plaidItems = pgTable('plaid_items', {
  id: requiredUuidColumn('id').primaryKey().defaultRandom(),
  itemId: text('item_id').notNull().unique(), // Plaid's item_id
  accessToken: requiredTextColumn('access_token'),
  institutionId: text('institution_id')
    .references(() => financialInstitutions.id)
    .notNull(),
  status: institutionStatusEnum('status').default('active').notNull(),
  consentExpiresAt: optionalTimestampColumn('consent_expires_at'),
  transactionsCursor: optionalTextColumn('transactions_cursor'),
  error: optionalTextColumn('error'),
  lastSyncedAt: optionalTimestampColumn('last_synced_at'),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  userId: requiredUuidColumn('user_id').references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  index('plaid_items_institution_id_idx').on(table.institutionId),
]);
export type PlaidItem = InferSelectModel<typeof plaidItems>;
export type PlaidItemInsert = InferInsertModel<typeof plaidItems>;
export type PlaidItemSelect = PlaidItem;

// Tables
export const financeAccounts = pgTable(
  'finance_accounts',
  {
    id: requiredUuidColumn('id').primaryKey().defaultRandom(),
    type: accountTypeEnum('type').notNull(),
    balance: requiredNumericColumn('balance'),
    interestRate: optionalNumericColumn('interest_rate'),
    minimumPayment: optionalNumericColumn('minimum_payment'),
    name: requiredTextColumn('name'),
    mask: optionalTextColumn('mask'),
    isoCurrencyCode: optionalTextColumn('iso_currency_code'),
    subtype: optionalTextColumn('subtype'),
    officialName: optionalTextColumn('official_name'),
    limit: optionalNumericColumn('limit'),
    meta: jsonColumn('meta'),
    lastUpdated: optionalTimestampColumn('last_updated'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    // Optional foreign keys to institution and plaid linkage
    institutionId: text('institution_id').references(() => financialInstitutions.id),
    plaidItemId: optionalUuidColumn('plaid_item_id').references(() => plaidItems.id),
    plaidAccountId: optionalTextColumn('plaid_account_id'),
    userId: requiredUuidColumn('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('finance_accounts_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.name} || ' ' || coalesce(${table.officialName}, ''))`,
    ),
    index('finance_accounts_institution_id_idx').on(table.institutionId),
    index('finance_accounts_plaid_item_id_idx').on(table.plaidItemId),
  ],
);
export type FinanceAccount = InferSelectModel<typeof financeAccounts>;
export type FinanceAccountInsert = InferInsertModel<typeof financeAccounts>;
export type FinanceAccountSelect = FinanceAccount;

export const transactions = pgTable(
  'transactions',
  {
    id: requiredUuidColumn('id').primaryKey().defaultRandom(),
    type: transactionTypeEnum('type').notNull(),
    amount: requiredNumericColumn('amount'),
    date: requiredTimestampColumn('date'),
    description: optionalTextColumn('description'),
    merchantName: optionalTextColumn('merchant_name'),
    accountId: uuid('account_id')
      .references(() => financeAccounts.id)
      .notNull(),
    fromAccountId: optionalUuidColumn('from_account_id').references(() => financeAccounts.id),
    toAccountId: optionalUuidColumn('to_account_id').references(() => financeAccounts.id),
    status: optionalTextColumn('status'),
    category: optionalTextColumn('category'),
    parentCategory: optionalTextColumn('parent_category'),
    excluded: booleanColumn('excluded'),
    tags: optionalTextColumn('tags'),
    accountMask: optionalTextColumn('account_mask'),
    note: optionalTextColumn('note'),
    recurring: booleanColumn('recurring'),
    pending: booleanColumn('pending'),
    paymentChannel: optionalTextColumn('payment_channel'),
    location: jsonb('location').$type<TransactionLocation>(),
    plaidTransactionId: text('plaid_transaction_id').unique(),
    source: text('source').default('manual'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    userId: requiredUuidColumn('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_date_idx').on(table.date),
    index('transactions_account_id_idx').on(table.accountId),
    index('transactions_from_account_id_idx').on(table.fromAccountId),
    index('transactions_to_account_id_idx').on(table.toAccountId),
    index('transactions_search_idx').using(
      'gin',
      sql`to_tsvector('english', coalesce(${table.description}, '') || ' ' || coalesce(${table.merchantName}, '') || ' ' || coalesce(${table.category}, '') || ' ' || coalesce(${table.parentCategory}, '') || ' ' || coalesce(${table.tags}, '') || ' ' || coalesce(${table.note}, '') || ' ' || coalesce(${table.paymentChannel}, '') || ' ' || coalesce(${table.source}, ''))`,
    ),
  ],
);
export type FinanceTransaction = InferSelectModel<typeof transactions>;
export type FinanceTransactionInsert = InferInsertModel<typeof transactions>;
export type FinanceTransactionSelect = FinanceTransaction;

export const budgetCategories = pgTable(
  'budget_categories',
  {
    id: requiredUuidColumn('id').primaryKey(),
    name: requiredTextColumn('name'),
    type: budgetCategoryTypeEnum('type').notNull(),
    budgetId: optionalUuidColumn('budget_id'),
    averageMonthlyExpense: optionalNumericColumn('average_monthly_expense'),
    color: optionalTextColumn('color'),
    userId: requiredUuidColumn('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('budget_categories_search_idx').using('gin', sql`to_tsvector('english', ${table.name})`),
    // Ensure each user can only have one budget category with a given name
    uniqueIndex('budget_categories_name_user_id_unique').on(table.name, table.userId),
  ],
);

export const budgetGoals = pgTable(
  'budget_goals',
  {
    id: requiredUuidColumn('id').primaryKey(),
    name: requiredTextColumn('name'),
    targetAmount: requiredNumericColumn('target_amount'),
    currentAmount: requiredNumericColumn('current_amount'),
    startDate: requiredTimestampColumn('start_date'),
    endDate: optionalTimestampColumn('end_date'),
    categoryId: optionalUuidColumn('category_id').references(() => budgetCategories.id),
    userId: requiredUuidColumn('user_id').references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('budget_goals_search_idx').using('gin', sql`to_tsvector('english', ${table.name})`),
  ],
);

export type BudgetCategory = InferSelectModel<typeof budgetCategories>;
export type BudgetCategoryInsert = InferInsertModel<typeof budgetCategories>;
export type BudgetCategorySelect = BudgetCategory;

export type BudgetGoal = InferSelectModel<typeof budgetGoals>;
export type BudgetGoalInsert = InferInsertModel<typeof budgetGoals>;
export type BudgetGoalSelect = BudgetGoal;

// Zod Validation Schemas
// Account Validation Schemas - for service layer validation
/**
 * FinanceAccountSchema - Complete account data as stored in database
 * Used for validating account information throughout the finance domain
 */
export const FinanceAccountSchema = z.object({
  id: z.string(),
  type: z.string(),
  balance: z.string().or(z.number()),
  name: z.string(),
  mask: z.string().nullable().optional(),
  isoCurrencyCode: z.string().nullable().optional(),
  subtype: z.string().nullable().optional(),
  officialName: z.string().nullable().optional(),
  limit: z.string().or(z.number()).nullable().optional(),
  meta: z.unknown().nullable().optional(),
  lastUpdated: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  institutionId: z.string().nullable().optional(),
  plaidItemId: z.string().nullable().optional(),
  plaidAccountId: z.string().nullable().optional(),
  userId: z.string(),
  interestRate: z.string().or(z.number()).nullable().optional(),
  minimumPayment: z.string().or(z.number()).nullable().optional(),
});

/**
 * FinanceAccountInsertSchema - Account data required for INSERT operations
 * Subset of FinanceAccountSchema with optional auto-generated fields
 */
export const FinanceAccountInsertSchema = FinanceAccountSchema.partial().extend({
  id: z.string().optional(),
  balance: z.string().or(z.number()),
  name: z.string(),
  type: z.string(),
  userId: z.string(),
});

// Transaction Validation Schemas - for service layer validation
/**
 * TransactionSchema - Complete transaction data as stored in database
 * Used for validating transaction information throughout the finance domain
 */
export const TransactionSchema = z.object({
  id: z.string(),
  type: z.string(),
  amount: z.string().or(z.number()),
  date: z.string(),
  description: z.string().nullable().optional(),
  merchantName: z.string().nullable().optional(),
  accountId: z.string(),
  fromAccountId: z.string().nullable().optional(),
  toAccountId: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  parentCategory: z.string().nullable().optional(),
  excluded: z.boolean().or(z.null()).default(false),
  tags: z.string().nullable().optional(),
  accountMask: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  recurring: z.boolean().or(z.null()).default(false),
  pending: z.boolean().or(z.null()).default(false),
  paymentChannel: z.string().nullable().optional(),
  location: z.unknown().nullable().optional(),
  plaidTransactionId: z.string().nullable().optional(),
  source: z.string().nullable().default('manual'),
  createdAt: z.string(),
  updatedAt: z.string(),
  userId: z.string(),
});

/**
 * TransactionInsertSchema - Transaction data required for INSERT operations
 * Subset of TransactionSchema with optional auto-generated fields
 */
export const TransactionInsertSchema = TransactionSchema.partial().extend({
  id: z.string().optional(),
  type: z.string(),
  amount: z.string().or(z.number()),
  accountId: z.string(),
});
