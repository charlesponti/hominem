import * as z from 'zod';

// ============================================================================
// Re-export Database Types (Single Source of Truth)
// ============================================================================

export type { EventOutput as Event, EventTypeEnum } from '@hominem/db/types/calendar';

// ============================================================================
// Output Types (Inferred from returns - these are optional aliases)
// ============================================================================

import type { EventOutput } from '@hominem/db/types/calendar';
import type { EventWithTagsAndPeople } from '@hominem/events-services';

export type EventsListOutput = EventWithTagsAndPeople[];
export type EventsGetOutput = EventWithTagsAndPeople;
export type EventsCreateOutput = EventWithTagsAndPeople;
export type EventsUpdateOutput = EventWithTagsAndPeople;
export type EventsDeleteOutput = { success: boolean };

// ============================================================================
// CREATE EVENT
// ============================================================================

export type EventsCreateInput = {
  title: string;
  description?: string | undefined;
  date?: string | Date | undefined;
  type?: string | undefined;
  tags?: string[] | undefined;
  people?: string[] | undefined;
};

export const eventsCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

// ============================================================================
// UPDATE EVENT
// ============================================================================

export type EventsUpdateInput = {
  title?: string;
  description?: string;
  date?: string | Date;
  dateStart?: string | Date;
  dateEnd?: string | Date;
  type?: string;
  tags?: string[];
  people?: string[];
};

export const eventsUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  dateStart: z.union([z.string(), z.date()]).optional(),
  dateEnd: z.union([z.string(), z.date()]).optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

// ============================================================================
// GOOGLE CALENDAR SYNC
// ============================================================================

export type EventsGoogleCalendarsOutput = Array<{
  id: string;
  summary: string;
  primary?: boolean;
}>;

export type EventsGoogleSyncInput = {
  calendarId: string;
  timeMin?: string;
  timeMax?: string;
};

export const eventsGoogleSyncSchema = z.object({
  calendarId: z.string(),
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
});

export type EventsGoogleSyncOutput = {
  syncedEvents: number;
  message: string;
};

export type EventsSyncStatusOutput = {
  lastSyncedAt: string | null;
  syncError: string | null;
  eventCount: number;
  connected: boolean;
};
