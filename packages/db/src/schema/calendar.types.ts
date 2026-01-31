/**
 * Computed Calendar Event Types
 *
 * This file contains all derived types computed from the Calendar Event schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from calendar.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { events, eventsTags, eventsUsers, eventsTransactions } from './calendar.schema'

// Inferred types from Drizzle schema
export type CalendarEvent = InferSelectModel<typeof events>
export type CalendarEventInsert = InferInsertModel<typeof events>

export type EventsTag = InferSelectModel<typeof eventsTags>
export type EventsTagInsert = InferInsertModel<typeof eventsTags>

export type EventsUser = InferSelectModel<typeof eventsUsers>
export type EventsUserInsert = InferInsertModel<typeof eventsUsers>

export type EventsTransaction = InferSelectModel<typeof eventsTransactions>
export type EventsTransactionInsert = InferInsertModel<typeof eventsTransactions>

// Legacy aliases for backward compatibility
export type CalendarEventOutput = CalendarEvent
export type CalendarEventSelect = CalendarEvent
export type CalendarEventInput = CalendarEventInsert

// ============================================
// RE-EXPORT ENUMS AND SUPPORTING TYPES
// ============================================

export type { EventSourceEnum } from './calendar.schema'

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
} from './calendar.schema'
