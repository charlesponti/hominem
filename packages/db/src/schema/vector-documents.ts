import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const vectorDocuments = pgTable('vector_documents', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  content: text('content').notNull(),
  metadata: text('metadata'),
  embedding: jsonb('embedding').$type<number[]>(),
  userId: uuid('user_id').notNull(),
  source: text('source'),
  sourceType: text('source_type'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})
