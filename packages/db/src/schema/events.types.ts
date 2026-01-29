/**
 * Computed Event Types
 *
 * This file contains all derived types computed from Event schema.
 * These types are computed ONCE and reused everywhere.
 *
 * Rule: Import from this file, not from calendar.schema.ts
 */

import type { CalendarEvent, CalendarEventInsert, EventTypeEnum } from './calendar.schema';

export type EventOutput = CalendarEvent;
export type EventInput = CalendarEventInsert;

// Re-export enum types for convenience
export type { EventTypeEnum };

// Re-export enum instances
export { eventTypeEnum } from './calendar.schema';
