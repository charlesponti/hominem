import { type AnyPgColumn, boolean, index, integer, json, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import * as z from 'zod';

import { contacts } from './contacts.schema';
import { transactions } from './finance.schema';
import { place } from './places.schema';
import { tags } from './tags.schema';
import { users } from './users.schema';
import { createdAtColumn, updatedAtColumn } from './shared.schema';

// Enums
export const eventTypeEnum = pgEnum('event_type', [
  'Transactions',
  'Events',
  'Birthdays',
  'Anniversaries',
  'Dates',
  'Messages',
  'Photos',
  'Relationship Start',
  'Relationship End',
  'Sex',
  'Movies',
  'Reading',
  'Habit',
  'Goal',
  'Recurring',
  'Travel',
  'Health',
]);
export type EventTypeEnum = (typeof eventTypeEnum.enumValues)[number];

export const eventSourceEnum = pgEnum('event_source', ['manual', 'google_calendar']);
export type EventSourceEnum = (typeof eventSourceEnum.enumValues)[number];

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
    completedInstances: integer('completed_instances').default(0),
    /**
     * Target value for quantified habits (e.g., 10000 steps)
     */
    targetValue: integer('target_value'),
    /**
     * Current value for quantified habits
     */
    currentValue: integer('current_value').default(0),
    /**
     * Unit of measurement (steps, miles, hours, etc.)
     */
    unit: text('unit'),
    /**
     * JSON reminder configuration
     */
    reminderSettings: json('reminder_settings'),
    /**
     * JSON array of dependencies or related events
     */
    dependencies: json('dependencies'),
    /**
     * JSON array of resources needed for this event
     */
    resources: json('resources'),
    /**
     * JSON array of milestones for goal tracking
     */
    milestones: json('milestones'),
    /**
     * Category for goal/activity classification
     */
    goalCategory: text('goal_category'),
    /**
     * Self-reference for parent event (for sub-goals, sub-tasks)
     */
    parentEventId: uuid('parent_event_id').references((): AnyPgColumn => events.id),
    // Travel/Booking Fields (from consolidated activity table)
    /**
     * Booking or reservation reference number
     */
    bookingReference: text('booking_reference'),
    /**
     * Cost/price of the event (for bookings, tickets, etc.)
     */
    price: text('price'),
    /**
     * URL to booking confirmation or event details
     */
    url: text('url'),
    // Health Tracking Fields (from consolidated health table)
    /**
     * Type of health activity (running, swimming, yoga, etc.)
     */
    activityType: text('activity_type'),
    /**
     * Duration of the activity in minutes
     */
    duration: integer('duration'),
    /**
     * Calories burned during the activity
     */
    caloriesBurned: integer('calories_burned'),
    // Goal Status Field (from consolidated goals table)
    /**
     * Status of goal/task (todo, in_progress, completed, archived)
     */
    status: text('status'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('events_external_id_idx').on(table.externalId),
    index('events_calendar_id_idx').on(table.calendarId),
    index('events_source_idx').on(table.source),
    index('events_type_idx').on(table.type),
    index('events_interval_idx').on(table.interval),
    index('events_goal_category_idx').on(table.goalCategory),
    index('events_streak_count_idx').on(table.streakCount),
    index('events_activity_type_idx').on(table.activityType),
    index('events_status_idx').on(table.status),
    index('events_place_id_idx').on(table.placeId),
    index('events_status_date_idx').on(table.status, table.date),
    index('events_user_id_date_idx').on(table.userId, table.date),
    uniqueIndex('events_external_calendar_unique').on(table.externalId, table.calendarId),
  ],
);

// Zod Schemas
export const EventInsertSchema = createInsertSchema(events, {
  type: z.string(),
  source: z.enum(['manual', 'google_calendar']),
  // Override timestamp fields created/updated to be strings (mode: 'string' in DB)
  createdAt: z.string(),
  updatedAt: z.string(),
  // Regular timestamp fields that use default mode (Date objects)
  date: z.date(),
  dateStart: z.date().nullable(),
  dateEnd: z.date().nullable(),
  dateTime: z.date().nullable(),
  lastSyncedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  // Override JSON fields
  reminderSettings: z.any().nullable(),
  dependencies: z.any().nullable(),
  resources: z.any().nullable(),
  milestones: z.any().nullable(),
});

export const EventSelectSchema = createSelectSchema(events, {
  type: z.string(),
  source: z.enum(['manual', 'google_calendar']),
  // Override timestamp fields created/updated to be strings (mode: 'string' in DB)
  createdAt: z.string(),
  updatedAt: z.string(),
  // Regular timestamp fields that use default mode (Date objects)
  date: z.date(),
  dateStart: z.date().nullable(),
  dateEnd: z.date().nullable(),
  dateTime: z.date().nullable(),
  lastSyncedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  // Override JSON fields
  reminderSettings: z.any().nullable(),
  dependencies: z.any().nullable(),
  resources: z.any().nullable(),
  milestones: z.any().nullable(),
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

export const eventsTags = pgTable('events_tags', {
  eventId: uuid('event_id').references(() => events.id),
  tagId: uuid('tag_id').references(() => tags.id),
});

export const eventsUsers = pgTable(
  'events_users',
  {
    eventId: uuid('event_id').references(() => events.id),
    personId: uuid('person_id').references(() => contacts.id),
  },
  (table) => [
    index('events_users_event_id_idx').on(table.eventId),
    index('events_users_person_id_idx').on(table.personId),
  ],
);

export const eventsTransactions = pgTable(
  'events_transactions',
  {
    eventId: uuid('event_id').references(() => events.id),
    transactionId: uuid('transaction_id').references(() => transactions.id),
  },
  (table) => [
    index('events_transactions_event_id_idx').on(table.eventId),
    index('events_transactions_transaction_id_idx').on(table.transactionId),
  ],
);
