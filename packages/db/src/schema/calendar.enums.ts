import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Calendar Event Types
 */
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

/**
 * Calendar Event Sources
 */
export const eventSourceEnum = pgEnum('event_source', ['manual', 'google_calendar']);
export type EventSourceEnum = (typeof eventSourceEnum.enumValues)[number];
