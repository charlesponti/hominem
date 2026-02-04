import type {
  CalendarEventInput,
  CalendarEventOutput,
  EventSourceEnum,
} from '@hominem/db/types/calendar';

import { db } from '@hominem/db';
import { events } from '@hominem/db/schema/calendar';
import { logger } from '@hominem/utils/logger';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { type calendar_v3, google, Auth } from 'googleapis';
import { v7 as uuidv7 } from 'uuid';

import { env } from './env';

type GoogleCalendarEvent = calendar_v3.Schema$Event;

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string | undefined;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export interface GoogleCalendarSyncStatus {
  lastSyncedAt: Date | null;
  syncError: string | null;
  eventCount: number;
}

/**
 * Convert a Google Calendar event to our internal calendar event format.
 * This is a pure function that can be used independently of the service class.
 * Returns a partial event object with all required fields.
 */
export function convertGoogleCalendarEvent(
  googleEvent: GoogleCalendarEvent,
  calendarId: string,
  userId: string,
): Partial<CalendarEventInput> & {
  id: string;
  title: string;
  date: Date;
  dateStart: Date | null;
  dateEnd: Date | null;
  lastSyncedAt: Date;
  type: 'Events';
  userId: string;
  source: 'google_calendar';
  externalId: string;
  calendarId: string;
  createdAt: string;
  updatedAt: string;
} {
  if (!googleEvent.id) {
    throw new Error('Google Calendar event must have an id');
  }

  const startDate = googleEvent.start?.dateTime || googleEvent.start?.date;
  const endDate = googleEvent.end?.dateTime || googleEvent.end?.date;
  const now = new Date().toISOString();

  return {
    id: uuidv7(),
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description || null,
    date: new Date(startDate || new Date()),
    dateStart: startDate ? new Date(startDate) : null,
    dateEnd: endDate ? new Date(endDate) : null,
    type: 'Events',
    userId,
    source: 'google_calendar',
    externalId: googleEvent.id,
    calendarId,
    lastSyncedAt: new Date(startDate || new Date()),
    syncError: null,
    createdAt: now,
    updatedAt: now,
  };
}

export class GoogleCalendarService {
  private oauth2Client: Auth.OAuth2Client;
  private calendar: ReturnType<typeof google.calendar>;
  private userId: string;

  constructor(userId: string, tokens: GoogleTokens) {
    this.userId = userId;
    this.oauth2Client = new Auth.OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI,
    );

    const credentials: { access_token: string; refresh_token?: string | null } = {
      access_token: tokens.accessToken,
    };
    if (tokens.refreshToken) {
      credentials.refresh_token = tokens.refreshToken;
    }
    this.oauth2Client.setCredentials(credentials);

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Sync events from Google Calendar to our database
   */
  async syncGoogleCalendarEvents(
    calendarId = 'primary',
    timeMin?: string,
    timeMax?: string,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // Fetch all events from Google Calendar with pagination
      const googleEvents: GoogleCalendarEvent[] = [];
      let pageToken: string | undefined;

      const timeMinParam = timeMin || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      do {
        const listParams: calendar_v3.Params$Resource$Events$List = {
          calendarId,
          timeMin: timeMinParam,
          maxResults: 2500,
          singleEvents: true,
          orderBy: 'startTime',
        };
        if (timeMax) {
          listParams.timeMax = timeMax;
        }
        if (pageToken) {
          listParams.pageToken = pageToken;
        }
        const response = await this.calendar.events.list(listParams);

        if (response.data.items) {
          googleEvents.push(...response.data.items);
        }
        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      logger.info('Fetched events from Google Calendar', {
        userId: this.userId,
        calendarId,
        count: googleEvents.length,
      });

      // Get existing synced events from our database for this calendar
      const existingEvents: CalendarEventOutput[] = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.userId, this.userId),
            eq(events.calendarId, calendarId),
            eq(events.source, 'google_calendar'),
          ),
        );

      const existingEventsByExternalId = new Map(existingEvents.map((e) => [e.externalId, e]));
      const googleEventIds = new Set<string>();
      const eventsToUpsert: CalendarEventInput[] = [];

       // Process each Google Calendar event
       for (const googleEvent of googleEvents) {
         if (!googleEvent.id) continue;
         googleEventIds.add(googleEvent.id);

         try {
           const eventData = convertGoogleCalendarEvent(googleEvent, calendarId, this.userId);
           const existingEvent = existingEventsByExternalId.get(googleEvent.id);

            if (existingEvent) {
              const googleUpdated = googleEvent.updated ? new Date(googleEvent.updated) : null;
              const localUpdated = existingEvent.updatedAt ? new Date(existingEvent.updatedAt) : null;

              if (
                !googleUpdated ||
                !localUpdated ||
                googleUpdated.getTime() > localUpdated.getTime()
              ) {
                // Prepare for update with all required fields
                const baseEvent: CalendarEventInput = {
                  ...eventData,
                  dateStart: eventData.dateStart || null,
                  dateEnd: eventData.dateEnd || null,
                  dateTime: null,
                  reminderSettings: null,
                  dependencies: null,
                  resources: null,
                  milestones: null,
                  deletedAt: null,
                  id: existingEvent.id, // Keep original ID
                  createdAt: existingEvent.createdAt,
                  updatedAt: googleUpdated ? googleUpdated.toISOString() : new Date().toISOString(),
                };
                eventsToUpsert.push(baseEvent);
                result.updated++;
              }
            } else {
              // Prepare for insert with all required fields
              const baseEvent: CalendarEventInput = {
                ...eventData,
                dateStart: eventData.dateStart || null,
                dateEnd: eventData.dateEnd || null,
                dateTime: null,
                reminderSettings: null,
                dependencies: null,
                resources: null,
                milestones: null,
                deletedAt: null,
                updatedAt: googleEvent.updated ? new Date(googleEvent.updated).toISOString() : new Date().toISOString(),
              };
              eventsToUpsert.push(baseEvent);
              result.created++;
            }
         } catch (error) {
           result.errors.push(
             `Failed to process event ${googleEvent.id}: ${
               error instanceof Error ? error.message : String(error)
             }`,
           );
         }
       }

       // Batch Upsert
       if (eventsToUpsert.length > 0) {
         const CHUNK_SIZE = 500;
         for (let i = 0; i < eventsToUpsert.length; i += CHUNK_SIZE) {
           const chunk = eventsToUpsert.slice(i, i + CHUNK_SIZE);
           await db
             .insert(events)
             .values(chunk as typeof events.$inferInsert[])
             .onConflictDoUpdate({
               target: [events.externalId, events.calendarId],
               set: {
                 title: sql`excluded.title`,
                 description: sql`excluded.description`,
                 date: sql`excluded.date`,
                 dateStart: sql`excluded.date_start`,
                 dateEnd: sql`excluded.date_end`,
                 lastSyncedAt: sql`excluded.last_synced_at`,
                 syncError: sql`excluded.sync_error`,
                 updatedAt: sql`excluded.updated_at`,
               },
             });
         }
       }

      // Handle deleted events
      const idsToMarkDeleted: string[] = existingEvents
        .filter((e) => e.externalId && !googleEventIds.has(e.externalId) && !e.deletedAt)
        .map((e) => e.id);

      if (idsToMarkDeleted.length > 0) {
        const CHUNK_SIZE = 500;
        for (let i = 0; i < idsToMarkDeleted.length; i += CHUNK_SIZE) {
          const chunk = idsToMarkDeleted.slice(i, i + CHUNK_SIZE);
          await db.update(events).set({ deletedAt: new Date() }).where(inArray(events.id, chunk));
          result.deleted += chunk.length;
        }
      }

      logger.info('Google Calendar sync completed', {
        userId: this.userId,
        calendarId,
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        errors: result.errors.length,
      });
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to sync Google Calendar: ${errorMessage}`);
      logger.error('Google Calendar sync failed', {
        userId: this.userId,
        calendarId,
        error: errorMessage,
      });
    }

    return result;
  }

  /**
   * Push a local event to Google Calendar
   */
  async pushEventToGoogle(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const eventData: CalendarEventOutput[] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (eventData.length === 0) {
        return { success: false, error: 'Event not found' };
      }

      const event = eventData[0];

      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      const googleEvent: Record<string, unknown> = {
        summary: event.title,
        description: event.description || undefined,
        start: {
          dateTime: event.dateStart?.toISOString() || event.date.toISOString(),
        },
        end: {
          dateTime: event.dateEnd?.toISOString() || event.date.toISOString(),
        },
      };

      if (event.externalId && event.calendarId) {
        // Update existing Google Calendar event
        await this.calendar.events.update({
          calendarId: event.calendarId,
          eventId: event.externalId,
          requestBody: googleEvent,
        });
      } else {
        // Create new Google Calendar event
        const calendarId = event.calendarId || 'primary';
        const result = await this.calendar.events.insert({
          calendarId,
          requestBody: googleEvent,
        });

        // Update our database with the new external ID
        await db
          .update(events)
          .set({
            externalId: result.data.id || null,
            calendarId,
            source: 'google_calendar' as EventSourceEnum,
            lastSyncedAt: new Date(),
          })
          .where(eq(events.id, eventId));
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to push event to Google Calendar', {
        eventId,
        userId: this.userId,
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEventFromGoogle(
    eventId: string,
    calendarId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to delete event from Google Calendar', {
        eventId,
        calendarId,
        userId: this.userId,
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get list of calendars from Google Calendar
   */
  async getCalendarList(): Promise<Array<{ id: string; summary: string }>> {
    try {
      const response = await this.calendar.calendarList.list();
      return (
        response.data.items
          ?.filter(
            (
              item,
            ): item is calendar_v3.Schema$CalendarListEntry & {
              id: string;
              summary: string;
            } => Boolean(item.id && item.summary),
          )
          .map((item) => ({
            id: item.id,
            summary: item.summary,
          })) || []
      );
    } catch (error) {
      logger.error('Error fetching calendar list', {
        userId: this.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to fetch calendar list');
    }
  }

  /**
   * Get sync status for user
   */
  async getSyncStatus(): Promise<GoogleCalendarSyncStatus> {
    const syncedEvents: CalendarEventOutput[] = await db
      .select()
      .from(events)
      .where(and(eq(events.userId, this.userId), eq(events.source, 'google_calendar')))
      .orderBy(events.lastSyncedAt);

    const lastEvent = syncedEvents[syncedEvents.length - 1];

    return {
      lastSyncedAt: lastEvent?.lastSyncedAt || null,
      syncError: lastEvent?.syncError || null,
      eventCount: syncedEvents.length,
    };
  }
}

/**
 * Helper to refresh Google OAuth token if needed
 */
export async function refreshGoogleToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const oauth2Client = new Auth.OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      return null;
    }

    return {
      accessToken: credentials.access_token,
      expiresIn: credentials.expiry_date || 3600,
    };
  } catch (error) {
    logger.error('Failed to refresh Google token', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
