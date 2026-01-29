/**
 * Computed Calendar Event Types
 *
 * This file contains all derived types computed from the Calendar Event schema.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from calendar.schema.ts
 */

import type { CalendarEvent, CalendarEventInsert, EventSourceEnum } from './calendar.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** CalendarEvent as retrieved from database */
export type CalendarEventOutput = CalendarEvent;

/** CalendarEvent insert input (for creating events) */
export type CalendarEventInput = CalendarEventInsert;

// Legacy aliases
export type CalendarEventSelect = CalendarEvent;

// ============================================
// RE-EXPORT ENUMS AND SUPPORTING TYPES
// ============================================

export type { EventSourceEnum };

// ============================================
// RE-EXPORT DRIZZLE TABLES / ENUMS
// ============================================

export {
  events,
  eventsTags,
  eventsUsers,
  eventsTransactions,
  eventTypeEnum,
  eventSourceEnum,
} from './calendar.schema';
