/**
 * Computed Event Types
 *
 * This file contains all derived types computed from Event schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from calendar.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { events } from './calendar.schema'

// Inferred types from Drizzle schema
export type Event = InferSelectModel<typeof events>
export type EventInsert = InferInsertModel<typeof events>

// Legacy aliases for backward compatibility
export type EventOutput = Event
export type EventInput = EventInsert

// Re-export enum types for convenience
export type { EventTypeEnum, EventSourceEnum } from './calendar.schema'

// Re-export enum instances
export { eventTypeEnum, eventSourceEnum } from './calendar.schema'
