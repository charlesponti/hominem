/**
 * Computed Calendar Event Types
 *
 * This file contains all derived types computed from the Calendar schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from calendar.schema.ts
 */

import type {
  EventTypeEnum,
  EventSourceEnum,
  EventInput,
  EventOutput,
} from './calendar.schema';

export type {
  EventTypeEnum,
  EventSourceEnum,
  EventInput,
  EventOutput,
};

// Backward compatibility aliases
export type CalendarEventInput = EventInput;
export type CalendarEventOutput = EventOutput;
