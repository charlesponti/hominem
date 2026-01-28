import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const health = pgTable('health', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: timestamp('date').notNull(),
  activityType: text('activity_type').notNull(),
  duration: integer('duration').notNull(),
  caloriesBurned: integer('calories_burned').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export interface Health {
  id: number;
  userId: string;
  date: Date;
  activityType: string;
  duration: number;
  caloriesBurned: number;
  notes: string | null;
  createdAt: Date | null;
}
export interface HealthInsert {
  id?: number;
  userId: string;
  date: Date;
  activityType: string;
  duration: number;
  caloriesBurned: number;
  notes?: string | null;
  createdAt?: Date | null;
}
export type HealthSelect = Health;
