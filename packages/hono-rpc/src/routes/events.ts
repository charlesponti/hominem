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

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

const updateEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  dateStart: z.union([z.string(), z.date()]).optional(),
  dateEnd: z.union([z.string(), z.date()]).optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

const syncGoogleCalendarSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
});

export const eventsRoutes = new Hono<AppContext>()
  // List events
  .get('/', publicMiddleware, async (c) => {
    try {
      const query = c.req.query();
      const tagNames = query.tagNames?.split(',');
      const companion = query.companion;
      const sortBy = query.sortBy as 'date-asc' | 'date-desc' | 'summary' | undefined;

      const events = await getEvents({ tagNames, companion, sortBy });
      return c.json(success(events));
    } catch (err) {
      console.error('[events.list] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch events'), 500);
    }
  })

  // Get event by ID
  .get('/:id', publicMiddleware, async (c) => {
    try {
      const id = c.req.param('id');
      const event = await getEventById(id);
      if (!event) {
        return c.json(error('NOT_FOUND', 'Event not found'), 404);
      }
      return c.json(success(event));
    } catch (err) {
      console.error('[events.get] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch event'), 500);
    }
  })

  // Create event
  .post('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = createEventSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const { title, description, date, type, tags, people } = parsed.data;

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return c.json(error('VALIDATION_ERROR', 'Title is required'), 400);
      }

      const dateValue = date ? new Date(date) : new Date();
      if (Number.isNaN(dateValue.getTime())) {
        return c.json(error('VALIDATION_ERROR', 'Invalid event date'), 400);
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
      return c.json(success(event), 201);
    } catch (err) {
      console.error('[events.create] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to create event'), 500);
    }
  })

  // Update event
  .patch('/:id', authMiddleware, async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const parsed = updateEventSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const updateData = parsed.data;

      // Convert string dates to Date objects and build update object
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
      return c.json(success(updated));
    } catch (err) {
      console.error('[events.update] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to update event'), 500);
    }
  })

  // Delete event
  .delete('/:id', authMiddleware, async (c) => {
    try {
      const id = c.req.param('id');
      const result = await deleteEvent(id);
      return c.json(success(result));
    } catch (err) {
      console.error('[events.delete] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete event'), 500);
    }
  })

  // Get Google Calendars
  .get('/google/calendars', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const supabase = c.get('supabase');

      if (!supabase) {
        return c.json(error('INTERNAL_ERROR', 'Supabase client not available'), 500);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.provider_token) {
        return c.json(
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
      return c.json(success(calendars));
    } catch (err) {
      console.error('[events.getGoogleCalendars] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to get Google calendars'), 500);
    }
  })

  // Sync Google Calendar
  .post('/google/sync', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const supabase = c.get('supabase');

      if (!supabase) {
        return c.json(error('INTERNAL_ERROR', 'Supabase client not available'), 500);
      }

      const body = await c.req.json();
      const parsed = syncGoogleCalendarSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.provider_token) {
        return c.json(
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

      const { calendarId, timeMin, timeMax } = parsed.data;
      const result = await googleService.syncGoogleCalendarEvents(calendarId, timeMin, timeMax);
      return c.json(success(result));
    } catch (err) {
      console.error('[events.syncGoogleCalendar] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to sync Google Calendar'), 500);
    }
  })

  // Get sync status
  .get('/sync/status', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const status = await getSyncStatus(userId);

      return c.json(
        success({
          ...status,
          connected: true, // Assume connected for now
        }),
      );
    } catch (err) {
      console.error('[events.getSyncStatus] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to get sync status'), 500);
    }
  });
