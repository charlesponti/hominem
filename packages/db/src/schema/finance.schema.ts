import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { type Json, type TransactionLocation, TransactionLocationSchema } from './shared.schema';
import { users } from './users.schema';

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
  'credit',
  'debit',
  'transfer',
  'investment',
]);
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
    name: text('name').notNull(),
    url: text('url'),
    logo: text('logo'),
    primaryColor: text('primary_color'),
    country: text('country'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('financial_institutions_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.name})`,
    ),
  ],
);
export type FinancialInstitution = typeof financialInstitutions.$inferSelect;
export type FinancialInstitutionInsert = typeof financialInstitutions.$inferInsert;

// Plaid items table to track connected institutions
export const plaidItems = pgTable('plaid_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: text('item_id').notNull().unique(), // Plaid's item_id
  accessToken: text('access_token').notNull(),
  institutionId: text('institution_id')
    .references(() => financialInstitutions.id)
    .notNull(),
  status: institutionStatusEnum('status').default('active').notNull(),
  consentExpiresAt: timestamp('consent_expires_at'),
  transactionsCursor: text('transactions_cursor'),
  error: text('error'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
});
export type PlaidItem = typeof plaidItems.$inferSelect;
export type PlaidItemInsert = typeof plaidItems.$inferInsert;

// Tables
export const financeAccounts = pgTable(
  'finance_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: accountTypeEnum('type').notNull(),
    balance: numeric('balance').notNull(),
    interestRate: numeric('interest_rate'),
    minimumPayment: numeric('minimum_payment'),
    name: text('name').notNull(),
    mask: text('mask'),
    isoCurrencyCode: text('iso_currency_code'),
    subtype: text('subtype'),
    officialName: text('official_name'),
    limit: numeric('limit'),
    meta: jsonb('meta').$type<Json>(),
    lastUpdated: timestamp('last_updated'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // Optional foreign keys to institution and plaid linkage
    institutionId: text('institution_id').references(() => financialInstitutions.id),
    plaidItemId: uuid('plaid_item_id').references(() => plaidItems.id),
    plaidAccountId: text('plaid_account_id'),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
  },
  (table) => [
    index('finance_accounts_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.name} || ' ' || coalesce(${table.officialName}, ''))`,
    ),
  ],
);
export type FinanceAccountInsert = typeof financeAccounts.$inferInsert;
export type FinanceAccount = typeof financeAccounts.$inferSelect;

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: transactionTypeEnum('type').notNull(),
    amount: numeric('amount').notNull(),
    date: timestamp('date').notNull(),
    description: text('description'),
    merchantName: text('merchant_name'),
    accountId: uuid('account_id')
      .references(() => financeAccounts.id)
      .notNull(),
    fromAccountId: uuid('from_account_id').references(() => financeAccounts.id),
    toAccountId: uuid('to_account_id').references(() => financeAccounts.id),
    status: text('status'),
    category: text('category'),
    parentCategory: text('parent_category'),
    excluded: boolean('excluded').default(false),
    tags: text('tags'),
    accountMask: text('account_mask'),
    note: text('note'),
    recurring: boolean('recurring').default(false),
    pending: boolean('pending').default(false),
    paymentChannel: text('payment_channel'),
    location: jsonb('location').$type<TransactionLocation>(),
    plaidTransactionId: text('plaid_transaction_id').unique(),
    source: text('source').default('manual'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
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
export type FinanceTransactionInsert = typeof transactions.$inferInsert;
export const insertTransactionSchema = createInsertSchema(transactions);
export const updateTransactionSchema = createSelectSchema(transactions);

export const budgetCategories = pgTable(
  'budget_categories',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    type: budgetCategoryTypeEnum('type').notNull(),
    budgetId: uuid('budget_id'),
    averageMonthlyExpense: numeric('average_monthly_expense'),
    color: text('color'),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
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
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    targetAmount: numeric('target_amount').notNull(),
    currentAmount: numeric('current_amount').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
    categoryId: uuid('category_id').references(() => budgetCategories.id),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
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
export type BudgetGoal = typeof budgetGoals.$inferSelect;

// Zod schemas generated from Drizzle
import { z } from 'zod';

export const AccountTypeEnum = z.enum(accountTypeEnum.enumValues as [string, ...string[]]);
export const TransactionTypeEnum = z.enum(transactionTypeEnum.enumValues as [string, ...string[]]);

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
