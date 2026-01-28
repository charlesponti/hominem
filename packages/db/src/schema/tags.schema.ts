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

export interface Tag {
  id: string;
  name: string;
  userId: string | null;
  description: string | null;
  color: string | null;
}
export type TagSelect = Tag;
export interface TagInsert {
  id: string;
  name: string;
  userId?: string | null;
  description?: string | null;
  color?: string | null;
}
