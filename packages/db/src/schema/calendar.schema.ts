/**
 * Calendar Schema - Re-export Module
 * 
 * This file has been refactored into focused modules for better maintainability
 * and type performance. Import from the specific modules below for tree-shaking
 * benefits, or continue importing from this file for backward compatibility.
 * 
 * Module Structure:
 * - calendar.enums.ts - Event type and source enums
 * - calendar-events.schema.ts - Main events table and Zod validation schemas
 * - calendar-junctions.schema.ts - Junction tables (tags, users, transactions)
 */

// Enums
export {
  eventTypeEnum,
  eventSourceEnum,
  type EventTypeEnum,
  type EventSourceEnum,
} from './calendar.enums';

// Main events table and validation schemas
export {
  events,
  EventInsertSchema,
  EventSelectSchema,
  type EventInput,
  type EventOutput,
  type CalendarEventInsert,
  type CalendarEvent,
} from './calendar-events.schema';

// Junction tables
export {
  eventsTags,
  eventsUsers,
  eventsTransactions,
} from './calendar-junctions.schema';
