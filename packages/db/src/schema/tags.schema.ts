import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    userId: uuid('user_id').references(() => users.id),
    description: text('description'),
    color: text('color'),
  },
  (table) => [uniqueIndex('tags_name_unique').on(table.name)]
)

export type Tag = typeof tags.$inferSelect
export type TagSelect = typeof tags.$inferSelect
export type TagInsert = typeof tags.$inferInsert
