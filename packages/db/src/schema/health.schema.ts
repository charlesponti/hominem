import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import * as z from 'zod';
import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

export const health = pgTable('health', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  activityType: text('activity_type').notNull(),
  duration: integer('duration').notNull(),
  caloriesBurned: integer('calories_burned').notNull(),
  notes: text('notes'),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
}, (table) => [
  index('health_user_id_idx').on(table.userId),
  index('health_date_idx').on(table.date),
]);

export const HealthInsertSchema = createInsertSchema(health, {
  createdAt: z.string(),
  updatedAt: z.string(),
  date: z.date(),
});
export const HealthSelectSchema = createSelectSchema(health, {
  createdAt: z.string(),
  updatedAt: z.string(),
  date: z.date(),
});
export type HealthInput = z.infer<typeof HealthInsertSchema>;
export type HealthOutput = z.infer<typeof HealthSelectSchema>;
