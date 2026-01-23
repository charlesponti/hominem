import { relations, sql } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
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
export type FinancialInstitution = typeof financialInstitutions.$inferSelect;
export type FinancialInstitutionSelect = typeof financialInstitutions.$inferSelect;
export type FinancialInstitutionInsert = typeof financialInstitutions.$inferInsert;

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
  userId: requiredUuidColumn('user_id').references(() => users.id),
});
export type PlaidItem = typeof plaidItems.$inferSelect;
export type PlaidItemSelect = typeof plaidItems.$inferSelect;
export type PlaidItemInsert = typeof plaidItems.$inferInsert;

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
    userId: requiredUuidColumn('user_id').references(() => users.id),
  },
  (table) => [
    index('finance_accounts_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.name} || ' ' || coalesce(${table.officialName}, ''))`,
    ),
  ],
);
export type FinanceAccount = typeof financeAccounts.$inferSelect;
export type FinanceAccountSelect = typeof financeAccounts.$inferSelect;
export type FinanceAccountInsert = typeof financeAccounts.$inferInsert;

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
    userId: requiredUuidColumn('user_id').references(() => users.id),
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_date_idx').on(table.date),
    index('transactions_account_id_idx').on(table.accountId),
    index('transactions_search_idx').using(
      'gin',
      sql`to_tsvector('english', coalesce(${table.description}, '') || ' ' || coalesce(${table.merchantName}, '') || ' ' || coalesce(${table.category}, '') || ' ' || coalesce(${table.parentCategory}, '') || ' ' || coalesce(${table.tags}, '') || ' ' || coalesce(${table.note}, '') || ' ' || coalesce(${table.paymentChannel}, '') || ' ' || coalesce(${table.source}, ''))`,
    ),
  ],
);
export type FinanceTransaction = typeof transactions.$inferSelect;
export type FinanceTransactionSelect = typeof transactions.$inferSelect;
export type FinanceTransactionInsert = typeof transactions.$inferInsert;
export const insertTransactionSchema = createInsertSchema(transactions, {
  type: TransactionTypeEnum,
  location: TransactionLocationSchema.optional().nullable(),
});
export const updateTransactionSchema = createSelectSchema(transactions);

export const budgetCategories = pgTable(
  'budget_categories',
  {
    id: requiredUuidColumn('id').primaryKey(),
    name: requiredTextColumn('name'),
    type: budgetCategoryTypeEnum('type').notNull(),
    budgetId: optionalUuidColumn('budget_id'),
    averageMonthlyExpense: optionalNumericColumn('average_monthly_expense'),
    color: optionalTextColumn('color'),
    userId: requiredUuidColumn('user_id').references(() => users.id),
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
    userId: requiredUuidColumn('user_id').references(() => users.id),
  },
  (table) => [
    index('budget_goals_search_idx').using('gin', sql`to_tsvector('english', ${table.name})`),
  ],
);

// Relations
export const financialInstitutionRelations = relations(financialInstitutions, ({ many }) => ({
  plaidItems: many(plaidItems),
  accounts: many(financeAccounts),
}));

export const plaidItemRelations = relations(plaidItems, ({ one, many }) => ({
  institution: one(financialInstitutions, {
    fields: [plaidItems.institutionId],
    references: [financialInstitutions.id],
  }),
  accounts: many(financeAccounts),
  user: one(users, {
    fields: [plaidItems.userId],
    references: [users.id],
  }),
}));

export const financeAccountRelations = relations(financeAccounts, ({ one, many }) => ({
  fromTransactions: many(transactions, { relationName: 'fromAccount' }),
  toTransactions: many(transactions, { relationName: 'toAccount' }),
  institution: one(financialInstitutions, {
    fields: [financeAccounts.institutionId],
    references: [financialInstitutions.id],
  }),
  plaidItem: one(plaidItems, {
    fields: [financeAccounts.plaidItemId],
    references: [plaidItems.id],
  }),
  user: one(users, {
    fields: [financeAccounts.userId],
    references: [users.id],
  }),
}));

export const transactionRelations = relations(transactions, ({ one }) => ({
  fromAccount: one(financeAccounts, {
    fields: [transactions.fromAccountId],
    references: [financeAccounts.id],
    relationName: 'fromAccount',
  }),
  toAccount: one(financeAccounts, {
    fields: [transactions.toAccountId],
    references: [financeAccounts.id],
    relationName: 'toAccount',
  }),
  category: one(budgetCategories, {
    fields: [transactions.category],
    references: [budgetCategories.id],
  }),
  account: one(financeAccounts, {
    fields: [transactions.accountId],
    references: [financeAccounts.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const budgetCategoryRelations = relations(budgetCategories, ({ many }) => ({
  goals: many(budgetGoals),
  transactions: many(transactions),
}));

export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type BudgetCategorySelect = typeof budgetCategories.$inferSelect;
export type BudgetCategoryInsert = typeof budgetCategories.$inferInsert;
export type BudgetGoal = typeof budgetGoals.$inferSelect;
export type BudgetGoalSelect = typeof budgetGoals.$inferSelect;
export type BudgetGoalInsert = typeof budgetGoals.$inferInsert;

// Zod schemas generated from Drizzle
export const AccountTypeEnum = z.enum(accountTypeEnum.enumValues as [string, ...string[]]);

export const FinanceAccountSchema = createSelectSchema(financeAccounts, {
  type: AccountTypeEnum,
  meta: z.custom<Json>().optional().nullable(),
});
export const FinanceAccountInsertSchema = createInsertSchema(financeAccounts, {
  type: AccountTypeEnum,
  meta: z.custom<Json>().optional().nullable(),
});
export const TransactionSchema = createSelectSchema(transactions, {
  type: TransactionTypeEnum,
  location: TransactionLocationSchema.optional().nullable(),
});
export const TransactionInsertSchema = createInsertSchema(transactions, {
  type: TransactionTypeEnum,
  location: TransactionLocationSchema.optional().nullable(),
});
