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

// Define the schema for markdown entries
export const markdownEntries = sqliteTable('markdown_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filePath: text('file_path').notNull(),
  processingDate: integer('processing_date', { mode: 'timestamp' }).notNull(),
  text: text('text').notNull(),
  section: text('section').notNull(),
  isTask: integer('is_task', { mode: 'boolean' }),
  isComplete: integer('is_complete', { mode: 'boolean' }),
  textAnalysis: text('text_analysis', { mode: 'json' }),
  // Add additional columns as needed
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
