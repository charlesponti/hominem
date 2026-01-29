/**
 * Computed Networking Event Types
 */

import type {
  NetworkingEvent,
  NetworkingEventInsert,
  NetworkingEventAttendee,
  NetworkingEventAttendeeInsert,
} from './networking_events.schema';

export type NetworkingEventOutput = NetworkingEvent;
export type NetworkingEventInput = NetworkingEventInsert;

export type NetworkingEventAttendeeOutput = NetworkingEventAttendee;
export type NetworkingEventAttendeeInput = NetworkingEventAttendeeInsert;

export { networking_events, networking_event_attendees } from './networking_events.schema';
