import { foreignKey, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm/relations'
import type { ContentStrategy } from '../../schemas/content-strategy.schema'
import { users } from './users.schema'

export const contentStrategies = pgTable(
  'content_strategies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    strategy: json('strategy').$type<ContentStrategy>().notNull(),
    userId: uuid('userId').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'content_strategies_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)

export const contentStrategiesRelations = relations(contentStrategies, ({ one }) => ({
  user: one(users, {
    fields: [contentStrategies.userId],
    references: [users.id],
  }),
}))

export type ContentStrategiesInsert = typeof contentStrategies.$inferInsert
export type ContentStrategiesSelect = typeof contentStrategies.$inferSelect
