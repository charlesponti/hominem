import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core'

export const health = pgTable('health', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid('user_id').notNull(),
  date: timestamp('date', { withTimezone: true, mode: 'string' }).notNull(),
  activityType: text('activity_type'),
  duration: integer('duration'),
  caloriesBurned: integer('calories_burned'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export type HealthInsert = typeof health.$inferInsert
