import { boolean, foreignKey, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm/relations'
import type { z } from 'zod'
import type { TextAnalysisSchema } from '../../schemas'
import { users } from './users.schema'

// Define the tag type to match our API expectations
export type NoteTag = { value: string }

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    title: text('title'),
    // Update the type to match what we're using in the API
    tags: json('tags').$type<NoteTag[]>().default([]),
    analysis: json('analysis').$type<z.infer<typeof TextAnalysisSchema>>(),
    isTask: boolean('is_task').default(false),
    isComplete: boolean('is_complete').default(false),
    userId: uuid('userId').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'idea_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}))
