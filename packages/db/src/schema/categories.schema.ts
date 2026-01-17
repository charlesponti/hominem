import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm/relations'
import { users } from './users.schema'

/**
 * Universal categories that can be used for both finance transactions and possessions
 * Supports hierarchical organization (e.g., "Electronics > Computers > Laptops")
 * or "Finance > Expenses > Entertainment"
 */
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  domain: text('domain').default('general').notNull(),
  icon: text('icon'),
  color: text('color'),
  parentId: uuid('parent_id'),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const categoryRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parent_category',
  }),
  children: many(categories, {
    relationName: 'parent_category',
  }),
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}))

export type Category = typeof categories.$inferSelect
export type CategoryInsert = typeof categories.$inferInsert
