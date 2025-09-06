import { relations } from 'drizzle-orm'
import { integer, pgTable, uuid } from 'drizzle-orm/pg-core'
import { item } from './items.schema'
import { trips } from './trips.schema'

export const tripItems = pgTable('trip_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id')
    .notNull()
    .references(() => item.id, { onDelete: 'cascade' }),
  day: integer('day').default(1).notNull(),
  order: integer('order').default(0).notNull(),
})

export const tripItemsRelations = relations(tripItems, ({ one }) => ({
  trip: one(trips, {
    fields: [tripItems.tripId],
    references: [trips.id],
  }),
  item: one(item, {
    fields: [tripItems.itemId],
    references: [item.id],
  }),
}))
