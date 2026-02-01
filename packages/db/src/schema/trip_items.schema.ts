import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { integer, pgTable, uuid } from 'drizzle-orm/pg-core';

import { item } from './items.schema';
import { trips } from './trips.schema';

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
});

export type TripItem = InferSelectModel<typeof tripItems>;
export type TripItemInsert = InferInsertModel<typeof tripItems>;
export type TripItemSelect = TripItem;
