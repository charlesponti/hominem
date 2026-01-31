import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const health = pgTable('health', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: timestamp('date').notNull(),
  activityType: text('activity_type').notNull(),
  duration: integer('duration').notNull(),
  caloriesBurned: integer('calories_burned').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Health = InferSelectModel<typeof health>;
export type HealthInsert = InferInsertModel<typeof health>;
export type HealthSelect = Health;
