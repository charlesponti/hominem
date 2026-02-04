import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const TripInsertSchema = createInsertSchema(trips, {
  createdAt: z.string(),
  updatedAt: z.string(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
});
export const TripSelectSchema = createSelectSchema(trips, {
  createdAt: z.string(),
  updatedAt: z.string(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
});
export type TripInsertSchemaType = z.infer<typeof TripInsertSchema>;
export type TripSelectSchemaType = z.infer<typeof TripSelectSchema>;
export type Trip = TripSelectSchemaType;
export type TripInsert = TripInsertSchemaType;
export type TripSelect = Trip;
