import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { eventSourceEnum, eventTypeEnum } from './calendar.enums';
import type { GoalMilestone } from './goals.schema';
import { place } from './places.schema';
import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

/**
 * Events Table
 *
 * Core calendar events with activity tracking, habit tracking, and relationship features.
 * This table has been extracted from calendar.schema.ts for better modularity.
 */
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    date: timestamp('date').notNull(),
    placeId: uuid('place_id').references(() => place.id),
    dateStart: timestamp('date_start'),
    dateEnd: timestamp('date_end'),
    dateTime: timestamp('date_time'),
    type: eventTypeEnum('type').notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    source: eventSourceEnum('source').default('manual').notNull(),
    externalId: text('external_id'),
    calendarId: text('calendar_id'),
    lastSyncedAt: timestamp('last_synced_at'),
    syncError: text('sync_error'),
    /**
     * Notes about the visit (e.g., meal ordered)
     */
    visitNotes: text('visit_notes'),
    /**
     * User's rating of the place (1-5)
     */
    visitRating: integer('visit_rating'),
    /**
     * Written review of the visit
     */
    visitReview: text('visit_review'),
    /**
     * List of people who were present at this visit (JSON array or comma-separated)
     */
    visitPeople: text('visit_people'),
    // Activity/Habit Tracking Fields (from consolidated activities table)
    /**
     * Recurrence interval (daily, weekly, monthly, custom)
     */
    interval: text('interval'),
    /**
     * RFC 5545 recurrence rule for complex patterns
     */
    recurrenceRule: text('recurrence_rule'),
    /**
     * Achievement/engagement score for this event
     */
    score: integer('score'),
    /**
     * Priority level (1-10)
     */
    priority: integer('priority'),
    /**
     * Category for goals
     */
    goalCategory: text('goal_category'),
    /**
     * Target value for goals
     */
    targetValue: integer('target_value'),
    /**
     * Current value for goals
     */
    currentValue: integer('current_value').default(0),
    /**
     * Unit for goal values
     */
    unit: text('unit'),
    /**
     * Whether this tracked event is completed
     */
    isCompleted: boolean('is_completed').default(false),
    /**
     * Consecutive completions for habit tracking
     */
    streakCount: integer('streak_count').default(0),
    /**
     * Total number of times this recurring event was completed
     */
    totalCompletions: integer('total_completions').default(0),
    /**
     * Completed instances for habits
     */
    completedInstances: integer('completed_instances').default(0),
    /**
     * Last time this recurring event was completed
     */
    lastCompletedAt: timestamp('last_completed_at'),
    /**
     * Number of days until this event expires (for goal tracking)
     */
    expiresInDays: integer('expires_in_days'),
    /**
     * Time of day when reminders should be sent (HH:MM format)
     */
    reminderTime: text('reminder_time'),
    /**
     * JSON array of reminder configurations
     */
    reminderSettings: json('reminder_settings'),
    /**
     * ID of the parent event (for recurring events)
     */
    parentEventId: uuid('parent_event_id').references((): AnyPgColumn => events.id),
    /**
     * Event status
     */
    status: text('status').default('active'),
    /**
     * Soft delete timestamp
     */
    deletedAt: timestamp('deleted_at'),
    /**
     * Type of activity (for activity tracking)
     */
    activityType: text('activity_type'),
    /**
     * Duration in minutes (for health activities)
     */
    duration: integer('duration'),
    /**
     * Calories burned (for health activities)
     */
    caloriesBurned: integer('calories_burned'),
    /**
     * Whether this event is a template for recurring events
     */
    isTemplate: boolean('is_template').default(false),
    /**
     * Next occurrence date for recurring events
     */
    nextOccurrence: timestamp('next_occurrence'),
    /**
     * JSON array of prerequisite event IDs
     */
    dependencies: json('dependencies'),
    /**
     * JSON array of resource URLs/IDs
     */
    resources: json('resources'),
    /**
     * JSON array of milestone configurations
     */
    milestones: json('milestones').$type<GoalMilestone[]>(),
    // Metadata
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('events_user_id_idx').on(table.userId),
    index('events_date_idx').on(table.date),
    index('events_type_idx').on(table.type),
    index('events_activity_type_idx').on(table.activityType),
    index('events_status_idx').on(table.status),
    index('events_place_id_idx').on(table.placeId),
    index('events_status_date_idx').on(table.status, table.date),
    index('events_user_id_date_idx').on(table.userId, table.date),
    uniqueIndex('events_external_calendar_unique').on(table.externalId, table.calendarId),
  ],
);

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import * as z from 'zod';
import { GoalMilestoneSchema } from './goals.schema';

/**
 * Zod Schema for Event Insert Operations
 *
 * Note: createdAt and updatedAt are not refined here because they use the spread
 * operator from shared.schema.ts with mode: 'string', which drizzle-zod handles automatically.
 */
export const EventInsertSchema = createInsertSchema(events, {
  type: z.string(),
  source: z.enum(['manual', 'google_calendar']),
  // Regular timestamp fields that use default mode (Date objects)
  date: z.date(),
  dateStart: z.date().nullable(),
  dateEnd: z.date().nullable(),
  dateTime: z.date().nullable(),
  lastSyncedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  // Integer fields
  targetValue: z.number().int().nullable(),
  currentValue: z.number().int().default(0),
  completedInstances: z.number().int().default(0),
  duration: z.number().int().nullable(),
  caloriesBurned: z.number().int().nullable(),
  // Text fields
  unit: z.string().nullable(),
  goalCategory: z.string().nullable(),
  // JSON fields
  reminderSettings: z.unknown().nullable(),
  dependencies: z.unknown().nullable(),
  resources: z.unknown().nullable(),
  milestones: z.array(GoalMilestoneSchema).nullable(),
});

/**
 * Zod Schema for Event Select Operations
 *
 * Note: createdAt and updatedAt are not refined here because they use the spread
 * operator from shared.schema.ts with mode: 'string', which drizzle-zod handles automatically.
 */
export const EventSelectSchema = createSelectSchema(events, {
  type: z.string(),
  source: z.enum(['manual', 'google_calendar']),
  // Regular timestamp fields that use default mode (Date objects)
  date: z.date(),
  dateStart: z.date().nullable(),
  dateEnd: z.date().nullable(),
  dateTime: z.date().nullable(),
  lastSyncedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  // Integer fields
  targetValue: z.number().int().nullable(),
  currentValue: z.number().int(),
  completedInstances: z.number().int(),
  duration: z.number().int().nullable(),
  caloriesBurned: z.number().int().nullable(),
  // Text fields
  unit: z.string().nullable(),
  goalCategory: z.string().nullable(),
  // JSON fields
  reminderSettings: z.unknown().nullable(),
  dependencies: z.unknown().nullable(),
  resources: z.unknown().nullable(),
  milestones: z.array(GoalMilestoneSchema).nullable(),
});

export type EventInput = z.infer<typeof EventInsertSchema>;
export type EventOutput = z.infer<typeof EventSelectSchema>;

// Backward compatibility aliases
/**
 * @deprecated Use {@link EventInput} instead. This alias will be removed in a future version.
 */
export type CalendarEventInsert = EventInput;

/**
 * @deprecated Use {@link EventOutput} instead. This alias will be removed in a future version.
 */
export type CalendarEvent = EventOutput;
