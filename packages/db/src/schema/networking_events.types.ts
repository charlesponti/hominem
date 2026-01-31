/**
 * Computed Networking Event Types
 *
 * This file contains all derived types computed from Networking Event schema.
 * These types are inferred from Drizzle ORM schema definitions.
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { networking_events, networking_event_attendees } from './networking_events.schema'

// Inferred types from Drizzle schema
export type NetworkingEvent = InferSelectModel<typeof networking_events>
export type NetworkingEventInsert = InferInsertModel<typeof networking_events>
export type NetworkingEventAttendee = InferSelectModel<typeof networking_event_attendees>
export type NetworkingEventAttendeeInsert = InferInsertModel<typeof networking_event_attendees>

// Legacy aliases for backward compatibility
export type NetworkingEventOutput = NetworkingEvent
export type NetworkingEventInput = NetworkingEventInsert

export type NetworkingEventAttendeeOutput = NetworkingEventAttendee
export type NetworkingEventAttendeeInput = NetworkingEventAttendeeInsert

// Re-export tables for convenience
export { networking_events, networking_event_attendees } from './networking_events.schema'
