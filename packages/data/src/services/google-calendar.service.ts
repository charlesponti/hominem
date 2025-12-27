import { and, eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { type calendar_v3, google } from "googleapis";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db";
import {
  type CalendarEventInsert,
  type EventSourceEnum,
  events,
} from "../db/schema";

type GoogleCalendarEvent = calendar_v3.Schema$Event;

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export interface SyncStatus {
  lastSyncedAt: Date | null;
  syncError: string | null;
  eventCount: number;
}

/**
 * Convert a Google Calendar event to our internal calendar event format.
 * This is a pure function that can be used independently of the service class.
 */
export function convertGoogleCalendarEvent(
  googleEvent: GoogleCalendarEvent,
  calendarId: string,
  userId: string
): CalendarEventInsert {
  if (!googleEvent.id) {
    throw new Error("Google Calendar event must have an id");
  }

  const startDate = googleEvent.start?.dateTime || googleEvent.start?.date;
  const endDate = googleEvent.end?.dateTime || googleEvent.end?.date;

  return {
    id: uuidv7(),
    title: googleEvent.summary || "Untitled Event",
    description: googleEvent.description || null,
    date: new Date(startDate || new Date()),
    dateStart: startDate ? new Date(startDate) : null,
    dateEnd: endDate ? new Date(endDate) : null,
    type: "Events",
    userId,
    source: "google_calendar",
    externalId: googleEvent.id,
    calendarId,
    lastSyncedAt: new Date(),
    syncError: null,
  };
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: ReturnType<typeof google.calendar>;
  private userId: string;

  constructor(userId: string, tokens: GoogleTokens) {
    this.userId = userId;
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
  }

  /**
   * Sync events from Google Calendar to our database
   */
  async syncGoogleCalendarEvents(
    calendarId = "primary",
    timeMin?: string,
    timeMax?: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    try {
      // Fetch events from Google Calendar
      const response = await this.calendar.events.list({
        calendarId,
        timeMin:
          timeMin ||
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        timeMax,
        maxResults: 2500,
        singleEvents: true,
        orderBy: "startTime",
      });

      const googleEvents = response.data.items || [];

      // Get existing synced events from our database for this calendar
      const existingEvents = await db
        .select()
        .from(events)
        .where(
          and(eq(events.userId, this.userId), eq(events.calendarId, calendarId))
        );

      const existingEventsByExternalId = new Map(
        existingEvents.map((e) => [e.externalId, e])
      );

      const googleEventIds = new Set<string>();

      // Process each Google Calendar event
      for (const googleEvent of googleEvents) {
        if (!googleEvent.id) continue;

        googleEventIds.add(googleEvent.id);

        try {
          const eventData = convertGoogleCalendarEvent(
            googleEvent,
            calendarId,
            this.userId
          );
          const existingEvent = existingEventsByExternalId.get(googleEvent.id);

          if (existingEvent) {
            // Check if Google Calendar event is newer
            const googleUpdated = googleEvent.updated
              ? new Date(googleEvent.updated)
              : null;
            const localUpdated = existingEvent.updatedAt;

            if (
              googleUpdated &&
              localUpdated &&
              googleUpdated.getTime() > localUpdated.getTime()
            ) {
              // Update existing event
              await this.updateLocalEvent(
                existingEvent.id,
                eventData,
                googleEvent.updated ?? undefined
              );
              result.updated++;
            }
          } else {
            // Create new event
            await this.createLocalEvent(
              eventData,
              googleEvent.updated || undefined
            );
            result.created++;
          }
        } catch (error) {
          result.errors.push(
            `Failed to sync event ${googleEvent.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Handle deleted events (events in our DB that no longer exist in Google Calendar)
      for (const existingEvent of existingEvents) {
        if (
          existingEvent.externalId &&
          !googleEventIds.has(existingEvent.externalId)
        ) {
          try {
            await db
              .update(events)
              .set({ deletedAt: new Date() })
              .where(eq(events.id, existingEvent.id));
            result.deleted++;
          } catch (error) {
            result.errors.push(
              `Failed to mark event as deleted ${existingEvent.id}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Failed to sync Google Calendar: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return result;
  }

  /**
   * Push a local event to Google Calendar
   */
  async pushEventToGoogle(
    eventId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const eventData = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (eventData.length === 0) {
        return { success: false, error: "Event not found" };
      }

      const event = eventData[0];

      if (!event) {
        return { success: false, error: "Event not found" };
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
        const calendarId = event.calendarId || "primary";
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
            source: "google_calendar" as EventSourceEnum,
            lastSyncedAt: new Date(),
          })
          .where(eq(events.id, eventId));
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEventFromGoogle(
    eventId: string,
    calendarId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
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
              item
            ): item is calendar_v3.Schema$CalendarListEntry & {
              id: string;
              summary: string;
            } => Boolean(item.id && item.summary)
          )
          .map((item) => ({
            id: item.id,
            summary: item.summary,
          })) || []
      );
    } catch (error) {
      console.error("Error fetching calendar list:", error);
      throw new Error("Failed to fetch calendar list");
    }
  }

  /**
   * Get sync status for user
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const syncedEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.userId, this.userId),
          eq(events.source, "google_calendar")
        )
      )
      .orderBy(events.lastSyncedAt);

    const lastEvent = syncedEvents[syncedEvents.length - 1];

    return {
      lastSyncedAt: lastEvent?.lastSyncedAt || null,
      syncError: lastEvent?.syncError || null,
      eventCount: syncedEvents.length,
    };
  }

  /**
   * Create a local event from Google Calendar data
   */
  private async createLocalEvent(
    eventData: CalendarEventInsert,
    googleUpdatedAt?: string
  ) {
    await db.insert(events).values({
      ...eventData,
      createdAt: new Date(),
      updatedAt: googleUpdatedAt ? new Date(googleUpdatedAt) : new Date(),
    });
  }

  /**
   * Update a local event with Google Calendar data
   */
  private async updateLocalEvent(
    eventId: string,
    eventData: CalendarEventInsert,
    googleUpdatedAt?: string
  ) {
    await db
      .update(events)
      .set({
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        dateStart: eventData.dateStart,
        dateEnd: eventData.dateEnd,
        lastSyncedAt: new Date(),
        syncError: null,
        updatedAt: googleUpdatedAt ? new Date(googleUpdatedAt) : new Date(),
      })
      .where(eq(events.id, eventId));
  }
}

/**
 * Helper to refresh Google OAuth token if needed
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
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
    console.error("Failed to refresh Google token:", error);
    return null;
  }
}
