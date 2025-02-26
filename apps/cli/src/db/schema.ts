import { integer, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    name: text('name').notNull(),
    amount: real('amount').notNull(),
    status: text('status').notNull(),
    category: text('category').notNull(),
    parentCategory: text('parent_category').notNull(),
    excluded: integer('excluded', { mode: 'boolean' }).notNull().default(false),
    tags: text('tags'),
    type: text('type').notNull(),
    account: text('account').notNull(),
    accountMask: text('account_mask'),
    note: text('note'),
    recurring: text('recurring'),
    createdAt: text('created_at').default(`datetime('now')`).notNull(),
    updatedAt: text('updated_at').default(`datetime('now')`).notNull(),
  },
  (table) => [unique().on(table.date, table.name, table.amount, table.type, table.account)]
)
export type Transaction = typeof transactions.$inferSelect
export type TransactionInsert = typeof transactions.$inferInsert
export type TransactionType = Transaction['type']

export const venues = sqliteTable('venues', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  address: text('address').notNull(),
  createdAt: text('created_at').default(`datetime('now')`).notNull(),
  updatedAt: text('updated_at').default(`datetime('now')`).notNull(),
})

export type Venue = typeof venues.$inferSelect
