import { relations } from 'drizzle-orm'
import {
  boolean,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { events } from './calendar.schema'
import { users } from './users.schema'

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
  'credit',
  'debit',
  'transfer',
  'investment',
])
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number]
export const TransactionTypes = transactionTypeEnum.enumValues.reduce(
  (acc, val) => Object.assign(acc, { [val]: val }),
  {} as Record<TransactionType, TransactionType>
)

export const accountTypeEnum = pgEnum('account_type', [
  'checking',
  'savings',
  'investment',
  'credit',
  'loan',
  'retirement',
])

// Tables
export const financeAccounts = pgTable('finance_accounts', {
  id: uuid('id').primaryKey(),
  type: accountTypeEnum('type').notNull(),
  balance: numeric('balance').notNull(),
  interestRate: numeric('interest_rate'),
  minimumPayment: numeric('minimum_payment'),
  name: text('name').notNull(),
  // !TODO Create `institutions` table for financial institutions, such as "American Express", "Chase", etc.
  institutionId: text('institution_id'),
  meta: jsonb('meta'),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
})
export type FinanceAccountInsert = typeof financeAccounts.$inferInsert
export type FinanceAccount = typeof financeAccounts.$inferSelect

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey(),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount').notNull(),
  date: timestamp('date').notNull(),
  description: text('description'),
  accountId: uuid('account_id')
    .references(() => financeAccounts.id)
    .notNull(),
  fromAccountId: uuid('from_account_id').references(() => financeAccounts.id),
  toAccountId: uuid('to_account_id').references(() => financeAccounts.id),
  eventId: uuid('event_id').references(() => events.id),
  investmentDetails: jsonb('investment_details'),
  status: text('status'),
  category: text('category'),
  parentCategory: text('parent_category'),
  excluded: boolean('excluded').default(false),
  tags: text('tags'),
  accountMask: text('account_mask'),
  note: text('note'),
  recurring: boolean('recurring').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
})
export type Transaction = typeof transactions.$inferSelect
export type TransactionInsert = typeof transactions.$inferInsert

export const budgetCategories = pgTable('budget_categories', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  budgetId: uuid('budget_id'),
  averageMonthlyExpense: numeric('average_monthly_expense'),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
})

export const budgetGoals = pgTable('budget_goals', {
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
})

// Relations
export const financeAccountRelations = relations(financeAccounts, ({ many }) => ({
  fromTransactions: many(transactions, { relationName: 'fromAccount' }),
  toTransactions: many(transactions, { relationName: 'toAccount' }),
}))

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
  event: one(events, {
    fields: [transactions.eventId],
    references: [events.id],
  }),
  category: one(budgetCategories, {
    fields: [transactions.category],
    references: [budgetCategories.id],
  }),
}))

export const budgetCategoryRelations = relations(budgetCategories, ({ many }) => ({
  goals: many(budgetGoals),
  transactions: many(transactions),
}))

export type BudgetCategory = typeof budgetCategories.$inferSelect
export type BudgetGoal = typeof budgetGoals.$inferSelect
