/**
 * Computed Networking Event Types
 *
 * This file contains all derived types computed from the Networking Event schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from networking_events.schema.ts
 */

import type {
  NetworkingEvent,
  NetworkingEventInsert,
  NetworkingEventSelect,
  NewNetworkingEvent,
  NetworkingEventAttendee,
  NetworkingEventAttendeeInsert,
  NewNetworkingEventAttendee,
} from './networking_events.schema';

export type {
  NetworkingEvent,
  NetworkingEventInsert,
  NetworkingEventSelect,
  NewNetworkingEvent,
  NetworkingEventAttendee,
  NetworkingEventAttendeeInsert,
  NewNetworkingEventAttendee,
};

// Legacy aliases for backward compatibility
export type NetworkingEventOutput = NetworkingEvent;
export type NetworkingEventInput = NetworkingEventInsert;

export type NetworkingEventAttendeeOutput = NetworkingEventAttendee;
export type NetworkingEventAttendeeInput = NetworkingEventAttendeeInsert;
