/**
 * Computed Calendar Event Types
 *
 * This file contains all derived types computed from the Calendar schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from calendar.schema.ts
 */

import type {
  CalendarEvent,
  CalendarEventInsert,
  CalendarEventSelect,
  EventTypeEnum,
  EventSourceEnum,
  EventInsertSchemaType,
  EventSelectSchemaType,
} from './calendar.schema';

export type {
  CalendarEvent,
  CalendarEventInsert,
  CalendarEventSelect,
  EventTypeEnum,
  EventSourceEnum,
  EventInsertSchemaType,
  EventSelectSchemaType,
};

// Legacy aliases for backward compatibility
export type CalendarEventOutput = CalendarEvent;
export type CalendarEventInput = CalendarEventInsert;
