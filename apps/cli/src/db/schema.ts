import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const venues = sqliteTable('venues', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  address: text('address').notNull(),
  createdAt: text('created_at').default(`datetime('now')`).notNull(),
  updatedAt: text('updated_at').default(`datetime('now')`).notNull(),
})

export type Venue = typeof venues.$inferSelect

export const markdownEntries = sqliteTable('markdown_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filePath: text('file_path').notNull(),
  processingDate: integer('processing_date', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
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
