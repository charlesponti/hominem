import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export enum DocumentType {
  resume = 'resume',
  coverLetter = 'coverLetter',
  sample = 'sample',
  other = 'other',
}

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  description: text('description'),
  url: text('url'),
  type: text('type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
