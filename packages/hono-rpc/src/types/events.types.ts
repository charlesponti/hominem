import { z } from 'zod';

// ============================================================================
// Data Types
// ============================================================================

export type Event = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  date: string;
  type: string;
  tags: string[];
  people: string[];
  dateStart: string | null;
  dateEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// LIST EVENTS
// ============================================================================

export type EventsListInput = {
  tagNames?: string[];
  companion?: string;
  sortBy?: 'date-asc' | 'date-desc' | 'summary';
};

export type EventsListOutput = Event[];

// ============================================================================
// GET EVENT
// ============================================================================

export type EventsGetOutput = Event;

// ============================================================================
// CREATE EVENT
// ============================================================================

export type EventsCreateInput = {
  title: string;
  description?: string;
  date?: string | Date;
  type?: string;
  tags?: string[];
  people?: string[];
};

export const eventsCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

export type EventsCreateOutput = Event;

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

export type EventsUpdateOutput = Event;

// ============================================================================
// DELETE EVENT
// ============================================================================

export type EventsDeleteOutput = boolean;

// ============================================================================
// GOOGLE CALENDAR
// ============================================================================

export type GoogleCalendar = {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
};

export type EventsGoogleCalendarsOutput = GoogleCalendar[];

export type EventsGoogleSyncInput = {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
};

export const eventsGoogleSyncSchema = z.object({
  calendarId: z.string().optional().default('primary'),
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
