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
import { error, success } from '@hominem/services';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, publicMiddleware, type AppContext } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
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
  type EventJson,
} from '../types/events.types';

/**
 * Serialization Helpers
 */
function serializeEvent(e: any): EventJson {
  return {
    ...e,
    date: typeof e.date === 'string' ? e.date : e.date.toISOString(),
    dateStart: e.dateStart ? (typeof e.dateStart === 'string' ? e.dateStart : e.dateStart.toISOString()) : null,
    dateEnd: e.dateEnd ? (typeof e.dateEnd === 'string' ? e.dateEnd : e.dateEnd.toISOString()) : null,
    createdAt: typeof e.createdAt === 'string' ? e.createdAt : e.createdAt.toISOString(),
    updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : e.updatedAt.toISOString(),
    lastSyncedAt: e.lastSyncedAt ? (typeof e.lastSyncedAt === 'string' ? e.lastSyncedAt : e.lastSyncedAt.toISOString()) : null,
  };
}

export const eventsRoutes = new Hono<AppContext>()
  // List events
  .get('/', publicMiddleware, async (c) => {
    try {
      const query = c.req.query();
      const tagNames = query.tagNames?.split(',');
      const companion = query.companion;
      const sortBy = query.sortBy as 'date-asc' | 'date-desc' | 'summary' | undefined;

      const eventsData = await getEvents({ tagNames, companion, sortBy });
      return c.json<EventsListOutput>(success(eventsData.map(serializeEvent)));
    } catch (err) {
      console.error('[events.list] error:', err);
      return c.json<EventsListOutput>(error('INTERNAL_ERROR', 'Failed to fetch events'), 500);
    }
  })

  // Get event by ID
  .get('/:id', publicMiddleware, async (c) => {
    try {
      const id = c.req.param('id');
      const event = await getEventById(id);
      if (!event) {
        return c.json<EventsGetOutput>(error('NOT_FOUND', 'Event not found'), 404);
      }
      return c.json<EventsGetOutput>(success(serializeEvent(event)));
    } catch (err) {
      console.error('[events.get] error:', err);
      return c.json<EventsGetOutput>(error('INTERNAL_ERROR', 'Failed to fetch event'), 500);
    }
  })

  // Create event
  .post('/', authMiddleware, zValidator('json', eventsCreateSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const data = c.req.valid('json');

      const { title, description, date, type, tags, people } = data;

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return c.json<EventsCreateOutput>(error('VALIDATION_ERROR', 'Title is required'), 400);
      }

      const dateValue = date ? new Date(date) : new Date();
      if (Number.isNaN(dateValue.getTime())) {
        return c.json<EventsCreateOutput>(error('VALIDATION_ERROR', 'Invalid event date'), 400);
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
      return c.json<EventsCreateOutput>(success(serializeEvent(event)), 201);
    } catch (err) {
      console.error('[events.create] error:', err);
      return c.json<EventsCreateOutput>(error('INTERNAL_ERROR', 'Failed to create event'), 500);
    }
  })

  // Update event
  .patch('/:id', authMiddleware, zValidator('json', eventsUpdateSchema), async (c) => {
    try {
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
        return c.json<EventsUpdateOutput>(error('NOT_FOUND', 'Event not found'), 404);
      }
      return c.json<EventsUpdateOutput>(success(serializeEvent(updated)));
    } catch (err) {
      console.error('[events.update] error:', err);
      return c.json<EventsUpdateOutput>(error('INTERNAL_ERROR', 'Failed to update event'), 500);
    }
  })

  // Delete event
  .delete('/:id', authMiddleware, async (c) => {
    try {
      const id = c.req.param('id');
      const result = await deleteEvent(id);
      return c.json<EventsDeleteOutput>(success(result));
    } catch (err) {
      console.error('[events.delete] error:', err);
      return c.json<EventsDeleteOutput>(error('INTERNAL_ERROR', 'Failed to delete event'), 500);
    }
  })

  // Get Google Calendars
  .get('/google/calendars', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const supabase = c.get('supabase');

      if (!supabase) {
        return c.json<EventsGoogleCalendarsOutput>(error('INTERNAL_ERROR', 'Supabase client not available'), 500);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.provider_token) {
        return c.json<EventsGoogleCalendarsOutput>(
          error(
            'UNAUTHORIZED',
            'Google Calendar access token not found in session. Please reconnect your Google account.',
          ),
          401,
        );
      }

      const googleService = new GoogleCalendarService(userId, {
        accessToken: session.provider_token,
        refreshToken: session.provider_refresh_token || undefined,
      });

      const calendars = await googleService.getCalendarList();
      return c.json<EventsGoogleCalendarsOutput>(success(calendars as any));
    } catch (err) {
      console.error('[events.getGoogleCalendars] error:', err);
      return c.json<EventsGoogleCalendarsOutput>(error('INTERNAL_ERROR', 'Failed to get Google calendars'), 500);
    }
  })

  // Sync Google Calendar
  .post('/google/sync', authMiddleware, zValidator('json', eventsGoogleSyncSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const supabase = c.get('supabase');

      if (!supabase) {
        return c.json<EventsGoogleSyncOutput>(error('INTERNAL_ERROR', 'Supabase client not available'), 500);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.provider_token) {
        return c.json<EventsGoogleSyncOutput>(
          error(
            'UNAUTHORIZED',
            'Google Calendar access token not found in session. Please reconnect your Google account.',
          ),
          401,
        );
      }

      const googleService = new GoogleCalendarService(userId, {
        accessToken: session.provider_token,
        refreshToken: session.provider_refresh_token || undefined,
      });

      const { calendarId, timeMin, timeMax } = c.req.valid('json');
      const result = await googleService.syncGoogleCalendarEvents(calendarId, timeMin, timeMax);
      return c.json<EventsGoogleSyncOutput>(success({
        syncedEvents: result.syncedEvents,
        message: result.message,
      }));
    } catch (err) {
      console.error('[events.syncGoogleCalendar] error:', err);
      return c.json<EventsGoogleSyncOutput>(error('INTERNAL_ERROR', 'Failed to sync Google Calendar'), 500);
    }
  })

  // Get sync status
  .get('/sync/status', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const status = await getSyncStatus(userId);

      return c.json<EventsSyncStatusOutput>(
        success({
          lastSyncedAt: status.lastSyncedAt ? status.lastSyncedAt.toISOString() : null,
          syncError: status.syncError,
          eventCount: status.eventCount,
          connected: true, // Assume connected if token exists in session
        }),
      );
    } catch (err) {
      console.error('[events.getSyncStatus] error:', err);
      return c.json<EventsSyncStatusOutput>(error('INTERNAL_ERROR', 'Failed to get sync status'), 500);
    }
  });
