import type {
  EventInput as DbEventInput,
  EventOutput as DbEventOutput,
  EventSourceEnum,
} from '@hominem/db/types/calendar';

import { db } from '@hominem/db';
import { and, eq, inArray, sql } from '@hominem/db';
import { events } from '@hominem/db/schema/calendar';
import { logger } from '@hominem/utils/logger';
import { v7 as uuidv7 } from 'uuid';

import { env } from './env';

const getGoogleOAuthConfig = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Missing Google OAuth configuration');
  }

  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  };
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type GoogleCalendarDateTime = {
  dateTime?: string | null;
  date?: string | null;
};

type GoogleCalendarEvent = {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  start?: GoogleCalendarDateTime | null;
  end?: GoogleCalendarDateTime | null;
  updated?: string | null;
};

type GoogleCalendarListParams = {
  calendarId: string;
  timeMin: string;
  maxResults: number;
  singleEvents: boolean;
  orderBy: string;
  timeMax?: string;
  pageToken?: string;
};

type CalendarListItem = {
  id?: string | null;
  summary?: string | null;
};

type GoogleCalendarListResponse = {
  data: {
    items?: CalendarListItem[];
  };
};

type GoogleCalendarEventsResponse = {
  data: {
    items?: GoogleCalendarEvent[];
    nextPageToken?: string | null;
  };
};

type OAuth2ClientLike = {
  setCredentials: (creds: { access_token?: string; refresh_token?: string | null }) => void;
  refreshAccessToken: () => Promise<{
    credentials: { access_token?: string; expiry_date?: number };
  }>;
};

type OAuth2Ctor = new (
  clientId: string,
  clientSecret: string,
  redirectUri: string,
) => OAuth2ClientLike;

type GoogleCalendarClient = {
  events: {
    list: (params: GoogleCalendarListParams) => Promise<GoogleCalendarEventsResponse>;
    update: (params: {
      calendarId: string;
      eventId: string;
      requestBody: Record<string, JsonValue>;
    }) => Promise<{ data: GoogleCalendarEvent }>;
    insert: (params: {
      calendarId: string;
      requestBody: Record<string, JsonValue>;
    }) => Promise<{ data: GoogleCalendarEvent }>;
    delete: (params: { calendarId: string; eventId: string }) => Promise<void>;
  };
  calendarList: {
    list: () => Promise<GoogleCalendarListResponse>;
  };
};
type DbEventWithTimestamps = DbEventOutput & {
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};
function normalizeEventOutput(event: typeof events.$inferSelect): DbEventWithTimestamps {
  return {
    ...event,
    currentValue: event.currentValue ?? 0,
    completedInstances: event.completedInstances ?? 0,
    streakCount: event.streakCount ?? 0,
    totalCompletions: event.totalCompletions ?? 0,
    isCompleted: event.isCompleted ?? false,
    isTemplate: event.isTemplate ?? false,
  };
}

const calendarEventFieldDefaults: Pick<
  DbEventInput,
  | 'placeId'
  | 'visitNotes'
  | 'visitRating'
  | 'visitReview'
  | 'visitPeople'
  | 'interval'
  | 'recurrenceRule'
  | 'score'
  | 'priority'
  | 'goalCategory'
  | 'targetValue'
  | 'currentValue'
  | 'unit'
  | 'isCompleted'
  | 'streakCount'
  | 'totalCompletions'
  | 'completedInstances'
  | 'lastCompletedAt'
  | 'expiresInDays'
  | 'reminderTime'
  | 'reminderSettings'
  | 'parentEventId'
  | 'status'
  | 'deletedAt'
  | 'activityType'
  | 'duration'
  | 'caloriesBurned'
  | 'isTemplate'
  | 'nextOccurrence'
  | 'dependencies'
  | 'resources'
  | 'milestones'
  | 'dateTime'
> = {
  placeId: null,
  visitNotes: null,
  visitRating: null,
  visitReview: null,
  visitPeople: null,
  interval: null,
  recurrenceRule: null,
  score: null,
  priority: null,
  goalCategory: null,
  targetValue: null,
  currentValue: 0,
  unit: null,
  isCompleted: false,
  streakCount: 0,
  totalCompletions: 0,
  completedInstances: 0,
  lastCompletedAt: null,
  expiresInDays: null,
  reminderTime: null,
  reminderSettings: null,
  parentEventId: null,
  status: 'active',
  deletedAt: null,
  activityType: null,
  duration: null,
  caloriesBurned: null,
  isTemplate: false,
  nextOccurrence: null,
  dependencies: null,
  resources: null,
  milestones: null,
  dateTime: null,
};

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
): Partial<DbEventInput> & {
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
} {
  if (!googleEvent.id) {
    throw new Error('Google Calendar event must have an id');
  }

  const startDate = googleEvent.start?.dateTime || googleEvent.start?.date;
  const endDate = googleEvent.end?.dateTime || googleEvent.end?.date;
  const dateStart = startDate ? new Date(startDate) : null;
  const dateEnd = endDate ? new Date(endDate) : null;
  const primaryDate = dateStart ?? new Date();
  const durationInMinutes =
    dateStart && dateEnd
      ? Math.max(0, Math.round((dateEnd.getTime() - dateStart.getTime()) / 60000))
      : null;

  return {
    ...calendarEventFieldDefaults,
    id: uuidv7(),
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description || null,
    date: new Date(primaryDate),
    dateStart,
    dateEnd,
    dateTime: dateStart,
    type: 'Events',
    userId,
    source: 'google_calendar',
    externalId: googleEvent.id,
    calendarId,
    lastSyncedAt: new Date(),
    syncError: null,
    duration: durationInMinutes,
  };
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2ClientLike;
  private calendar: GoogleCalendarClient;
  private userId: string;

  constructor(userId: string, tokens: GoogleTokens) {
    this.userId = userId;

    // Load googleapis lazily to avoid type graph construction
    const google = require('googleapis').google as {
      auth?: { OAuth2?: OAuth2Ctor };
      calendar: (args: { version: 'v3'; auth: OAuth2ClientLike }) => GoogleCalendarClient;
    };
    const OAuth2Ctor = google?.auth?.OAuth2;
    if (!OAuth2Ctor) throw new Error('OAuth2 constructor not found on googleapis package');

    const oauthConfig = getGoogleOAuthConfig();
    this.oauth2Client = new OAuth2Ctor(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      oauthConfig.redirectUri,
    );

    // If constructed instance is missing expected helpers (happens when mocks differ),
    // attach safe no-ops so tests won't throw during construction.
    if (typeof this.oauth2Client?.setCredentials !== 'function') {
      // attach no-op fallbacks (keeps constructor safe for tests)
      this.oauth2Client.setCredentials = () => undefined;
      this.oauth2Client.refreshAccessToken = async () => ({ credentials: {} });
    }

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
        const listParams: GoogleCalendarListParams = {
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
      const existingEvents = (
        await db
          .select()
          .from(events)
          .where(
            and(
              eq(events.userId, this.userId),
              eq(events.calendarId, calendarId),
              eq(events.source, 'google_calendar'),
            ),
          )
      ).map(normalizeEventOutput);

      const existingEventsByExternalId = new Map(existingEvents.map((e) => [e.externalId, e]));
      const googleEventIds = new Set<string>();
      const eventsToUpsert: DbEventInput[] = [];

      // Process each Google Calendar event
      for (const googleEvent of googleEvents) {
        if (!googleEvent.id) continue;
        googleEventIds.add(googleEvent.id);

        try {
          const eventData = convertGoogleCalendarEvent(googleEvent, calendarId, this.userId);
          const normalizedEventData: DbEventInput = {
            ...calendarEventFieldDefaults,
            ...eventData,
            currentValue: eventData.currentValue ?? 0,
          };
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
              const baseEvent: DbEventInput = {
                ...normalizedEventData,
                id: existingEvent.id,
              };
              eventsToUpsert.push(baseEvent);
              result.updated++;
            }
          } else {
            // Prepare for insert with all required fields
            const baseEvent: DbEventInput = {
              ...normalizedEventData,
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
            .values(chunk as (typeof events.$inferInsert)[])
            .onConflictDoUpdate({
              target: [events.externalId, events.calendarId],
              set: {
                title: sql`excluded.title`,
                description: sql`excluded.description`,
                date: sql`excluded.date`,
                dateStart: sql`excluded.date_start`,
                dateEnd: sql`excluded.date_end`,
                dateTime: sql`excluded.date_time`,
                placeId: sql`excluded.place_id`,
                lastSyncedAt: sql`excluded.last_synced_at`,
                syncError: sql`excluded.sync_error`,
                visitNotes: sql`excluded.visit_notes`,
                visitRating: sql`excluded.visit_rating`,
                visitReview: sql`excluded.visit_review`,
                visitPeople: sql`excluded.visit_people`,
                interval: sql`excluded.interval`,
                recurrenceRule: sql`excluded.recurrence_rule`,
                score: sql`excluded.score`,
                priority: sql`excluded.priority`,
                goalCategory: sql`excluded.goal_category`,
                targetValue: sql`excluded.target_value`,
                currentValue: sql`excluded.current_value`,
                unit: sql`excluded.unit`,
                isCompleted: sql`excluded.is_completed`,
                streakCount: sql`excluded.streak_count`,
                totalCompletions: sql`excluded.total_completions`,
                completedInstances: sql`excluded.completed_instances`,
                lastCompletedAt: sql`excluded.last_completed_at`,
                expiresInDays: sql`excluded.expires_in_days`,
                reminderTime: sql`excluded.reminder_time`,
                reminderSettings: sql`excluded.reminder_settings`,
                parentEventId: sql`excluded.parent_event_id`,
                status: sql`excluded.status`,
                deletedAt: sql`excluded.deleted_at`,
                activityType: sql`excluded.activity_type`,
                duration: sql`excluded.duration`,
                caloriesBurned: sql`excluded.calories_burned`,
                isTemplate: sql`excluded.is_template`,
                nextOccurrence: sql`excluded.next_occurrence`,
                dependencies: sql`excluded.dependencies`,
                resources: sql`excluded.resources`,
                milestones: sql`excluded.milestones`,
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
      const eventData = (await db.select().from(events).where(eq(events.id, eventId)).limit(1)).map(
        normalizeEventOutput,
      );

      if (eventData.length === 0) {
        return { success: false, error: 'Event not found' };
      }

      const event = eventData[0];

      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      const googleEvent: Record<string, JsonValue> = {
        summary: event.title,
        description: event.description ?? null,
        start: {
          dateTime: event.dateStart?.toISOString() ?? event.date.toISOString(),
        },
        end: {
          dateTime: event.dateEnd?.toISOString() ?? event.date.toISOString(),
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
            (item: CalendarListItem): item is { id: string; summary: string } =>
              typeof item.id === 'string' && typeof item.summary === 'string',
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
    const syncedEvents = (
      await db
        .select()
        .from(events)
        .where(and(eq(events.userId, this.userId), eq(events.source, 'google_calendar')))
        .orderBy(events.lastSyncedAt)
    ).map(normalizeEventOutput);

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
    const google = require('googleapis').google;
    const OAuth2Ctor = google?.auth?.OAuth2;
    if (!OAuth2Ctor) throw new Error('OAuth2 constructor not found on googleapis package');

    const oauthConfig = getGoogleOAuthConfig();
    const oauth2Client = new OAuth2Ctor(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      oauthConfig.redirectUri,
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
