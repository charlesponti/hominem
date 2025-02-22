import {
  boolean,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey(),
  title: varchar('title', { length: 100 }),
  description: text('description').notNull(),
  type: text('type'),
  duration: integer('duration'),
  durationType: text('durationType'),
  interval: text('interval').notNull(),
  score: integer('score'),
  metrics: json('metrics').notNull(),
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate').notNull(),
  isCompleted: boolean('isCompleted').default(false),
  lastPerformed: timestamp('lastPerformed').notNull(),
  priority: integer('priority').notNull(),
  dependencies: json('dependencies').notNull(),
  resources: json('resources').notNull(),
  notes: text('notes').notNull(),
  dueDate: timestamp('dueDate').notNull(),
  status: text('status'),
  recurrenceRule: text('recurrenceRule').notNull(),
  completedInstances: integer('completedInstances').notNull(),
  streakCount: integer('streakCount').notNull(),
})
export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert
