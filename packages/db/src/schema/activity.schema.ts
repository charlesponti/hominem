import {
  type AnyPgColumn,
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
  // Fields for enhanced Habit Tracking
  targetValue: integer('targetValue'),
  currentValue: integer('currentValue').default(0),
  unit: text('unit'),
  reminderSettings: json('reminderSettings'),
  // Fields for enhanced Goal Setting
  goalCategory: text('goalCategory'),
  parentGoalId: uuid('parentGoalId').references((): AnyPgColumn => activities.id),
  milestones: json('milestones'),
})
export interface Activity {
  id: string;
  title: string | null;
  description: string;
  type: string | null;
  duration: number | null;
  durationType: string | null;
  interval: string;
  score: number | null;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  lastPerformed: Date;
  priority: number;
  dependencies: unknown;
  resources: unknown;
  notes: string;
  dueDate: Date;
  status: string | null;
  recurrenceRule: string;
  completedInstances: number;
  streakCount: number;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  reminderSettings: unknown;
  goalCategory: string | null;
  parentGoalId: string | null;
  milestones: unknown;
}
export type ActivitySelect = Activity;
export interface ActivityInsert {
  id: string;
  title?: string | null;
  description: string;
  type?: string | null;
  duration?: number | null;
  durationType?: string | null;
  interval: string;
  score?: number | null;
  startDate: Date;
  endDate: Date;
  isCompleted?: boolean;
  lastPerformed: Date;
  priority: number;
  dependencies: unknown;
  resources: unknown;
  notes: string;
  dueDate: Date;
  status?: string | null;
  recurrenceRule: string;
  completedInstances: number;
  streakCount: number;
  targetValue?: number | null;
  currentValue?: number;
  unit?: string | null;
  reminderSettings?: unknown;
  goalCategory?: string | null;
  parentGoalId?: string | null;
  milestones?: unknown;
}
