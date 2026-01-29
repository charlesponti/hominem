import type { EventTypeEnum } from '@hominem/db/schema';

import {
  createEvent,
  deleteEvent,
  GoogleCalendarService,
  getEventById,
  getEvents,
  getSyncStatus,
  updateEvent,
} from '@hominem/events-services';
import { NotFoundError, ValidationError, UnauthorizedError, InternalError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';
import {
  eventsCreateSchema,
  eventsUpdateSchema,
  eventsGoogleSyncSchema,
  type EventsListOutput,
  type EventsGetOutput,
  type EventsCreateOutput,
  type EventsUpdateOutput,
  type EventsDeleteOutput,
  type EventsGoogleCalendarsOutput,
  type EventsGoogleSyncOutput,
  type EventsSyncStatusOutput,
  type Event as EventJson,
} from '../types/events.types';

/**
 * Serialization Helpers
 */
function serializeEvent(e: any): EventJson {
  return {
    ...e,
    date: typeof e.date === 'string' ? e.date : e.date.toISOString(),
    dateStart: e.dateStart
      ? typeof e.dateStart === 'string'
        ? e.dateStart
        : e.dateStart.toISOString()
      : null,
    dateEnd: e.dateEnd
      ? typeof e.dateEnd === 'string'
        ? e.dateEnd
        : e.dateEnd.toISOString()
      : null,
    createdAt: typeof e.createdAt === 'string' ? e.createdAt : e.createdAt.toISOString(),
    updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : e.updatedAt.toISOString(),
    lastSyncedAt: e.lastSyncedAt
      ? typeof e.lastSyncedAt === 'string'
        ? e.lastSyncedAt
        : e.lastSyncedAt.toISOString()
      : null,
  };
}

export const eventsRoutes = new Hono<AppContext>()
  // ListOutput events
  .get('/', publicMiddleware, async (c) => {
    const query = c.req.query();
    const tagNames = query.tagNames?.split(',');
    const companion = query.companion;
    const sortBy = query.sortBy as 'date-asc' | 'date-desc' | 'summary' | undefined;

    const eventsData = await getEvents({ tagNames, companion, sortBy });
    return c.json<EventsListOutput>(eventsData.map(serializeEvent));
  })

  // Get event by ID
  .get('/:id', publicMiddleware, async (c) => {
    const id = c.req.param('id');
    const event = await getEventById(id);
    if (!event) {
      throw new NotFoundError('Event not found');
    }
    return c.json<EventsGetOutput>(serializeEvent(event));
  })

  // Create event
  .post('/', authMiddleware, zValidator('json', eventsCreateSchema), async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');

    const { title, description, date, type, tags, people } = data;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new ValidationError('Title is required');
    }

    const dateValue = date ? new Date(date) : new Date();
    if (Number.isNaN(dateValue.getTime())) {
      throw new ValidationError('Invalid event date');
    }

    const event = await createEvent({
      title: trimmedTitle,
      description,
      date: dateValue,
      type: type as EventTypeEnum,
      tags,
      people,
      userId,
    });
    return c.json<EventsCreateOutput>(serializeEvent(event), 201);
  })

  // Update event
  .patch('/:id', authMiddleware, zValidator('json', eventsUpdateSchema), async (c) => {
    const id = c.req.param('id');
    const updateData = c.req.valid('json');

    const eventData: Parameters<typeof updateEvent>[1] = Object.assign(
      {},
      updateData.title !== undefined && { title: updateData.title },
      updateData.description !== undefined && { description: updateData.description },
      updateData.date !== undefined && { date: new Date(updateData.date) },
      updateData.dateStart !== undefined && { dateStart: new Date(updateData.dateStart) },
      updateData.dateEnd !== undefined && { dateEnd: new Date(updateData.dateEnd) },
      updateData.type !== undefined && { type: updateData.type as EventTypeEnum },
      updateData.tags !== undefined && { tags: updateData.tags },
      updateData.people !== undefined && { people: updateData.people },
    );

    const updated = await updateEvent(id, eventData);
    if (!updated) {
      throw new NotFoundError('Event not found');
    }
    return c.json<EventsUpdateOutput>(serializeEvent(updated));
  })

  // Delete event
  .delete('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const result = await deleteEvent(id);
    return c.json<EventsDeleteOutput>(result);
  })

  // Get Google Calendars
  .get('/google/calendars', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const supabase = c.get('supabase');

    if (!supabase) {
      throw new InternalError('Supabase client not available');
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.provider_token) {
      throw new UnauthorizedError(
        'Google Calendar access token not found in session. Please reconnect your Google account.',
      );
    }

    const googleService = new GoogleCalendarService(userId, {
      accessToken: session.provider_token,
      refreshToken: session.provider_refresh_token || undefined,
    });

    const calendars = await googleService.getCalendarList();
    return c.json<EventsGoogleCalendarsOutput>(calendars as any);
  })

  // Sync Google Calendar
  .post('/google/sync', authMiddleware, zValidator('json', eventsGoogleSyncSchema), async (c) => {
    const userId = c.get('userId')!;
    const supabase = c.get('supabase');

    if (!supabase) {
      throw new InternalError('Supabase client not available');
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.provider_token) {
      throw new UnauthorizedError(
        'Google Calendar access token not found in session. Please reconnect your Google account.',
      );
    }

    const googleService = new GoogleCalendarService(userId, {
      accessToken: session.provider_token,
      refreshToken: session.provider_refresh_token || undefined,
    });

    const { calendarId, timeMin, timeMax } = c.req.valid('json');
    const result = await googleService.syncGoogleCalendarEvents(calendarId, timeMin, timeMax);
    return c.json<EventsGoogleSyncOutput>(
      {
        syncedEvents: result.created + result.updated + result.deleted,
        message: `Successfully synced ${result.created} created, ${result.updated} updated, and ${result.deleted} deleted events.`,
      },
    );
  })

  // Get sync status
  .get('/sync/status', authMiddleware, async (c) => {
    const userId = c.get('userId')!;
    const status = await getSyncStatus(userId);

    return c.json<EventsSyncStatusOutput>(
      {
        lastSyncedAt: status.lastSyncedAt ? status.lastSyncedAt.toISOString() : null,
        syncError: status.syncError,
        eventCount: status.eventCount,
        connected: true, // Assume connected if token exists in session
      },
    );
  });
