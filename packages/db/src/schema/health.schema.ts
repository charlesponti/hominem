import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const health = pgTable('health', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: timestamp('date').notNull(),
  activityType: text('activity_type').notNull(),
  duration: integer('duration').notNull(),
  caloriesBurned: integer('calories_burned').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('health_user_id_idx').on(table.userId),
  index('health_date_idx').on(table.date),
]);

export type Health = InferSelectModel<typeof health>;
export type HealthInsert = InferInsertModel<typeof health>;
export type HealthSelect = Health;
