import { db } from '.'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { calendarEvents } from '@hominem/db/schema/calendar'
import { logger } from '@hominem/utils/logger'
import { v7 as uuidv7 } from 'uuid'

import { env } from './env'

type CalendarEventInsert = typeof calendarEvents.$inferInsert
type CalendarEventSelect = typeof calendarEvents.$inferSelect

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

type GoogleCalendarEvent = {
  id?: string | null
  summary?: string | null
  description?: string | null
  updated?: string | null
  start?: {
    dateTime?: string | null
    date?: string | null
  } | null
  end?: {
    dateTime?: string | null
    date?: string | null
  } | null
}

type CalendarEventMetadata = {
  calendarId?: string
  deletedAt?: string | null
  lastSyncedAt?: string | null
  syncError?: string | null
}

type OAuth2Credentials = {
  access_token?: string | null
  refresh_token?: string | null
}

type OAuth2RefreshResponse = {
  credentials: {
    access_token?: string | null
    expiry_date?: number | null
  }
}

type OAuth2ClientLike = {
  setCredentials: (credentials: OAuth2Credentials) => void
  refreshAccessToken: () => Promise<OAuth2RefreshResponse>
}

type OAuth2CtorLike = new (
  clientId: string,
  clientSecret: string,
  redirectUri: string,
) => OAuth2ClientLike

type CalendarListParams = {
  calendarId: string
  timeMin: string
  maxResults: number
  singleEvents: boolean
  orderBy: 'startTime'
  timeMax?: string
  pageToken?: string
}

type CalendarListResponse = {
  data: {
    items?: GoogleCalendarEvent[] | null
    nextPageToken?: string | null
  }
}

type CalendarListItem = {
  id?: string | null
  summary?: string | null
}

type CalendarClientLike = {
  events: {
    list: (params: CalendarListParams) => Promise<CalendarListResponse>
    insert: (params: {
      calendarId: string
      requestBody: Record<string, JsonValue>
    }) => Promise<{ data: { id?: string | null } }>
    update: (params: {
      calendarId: string
      eventId: string
      requestBody: Record<string, JsonValue>
    }) => Promise<{ data: { id?: string | null } }>
    delete: (params: { calendarId: string; eventId: string }) => Promise<unknown>
  }
  calendarList: {
    list: () => Promise<{ data: { items?: CalendarListItem[] | null } }>
  }
}

type GoogleApisLike = {
  google: {
    auth: {
      OAuth2: OAuth2CtorLike
    }
    calendar: (input: { version: 'v3'; auth: OAuth2ClientLike }) => CalendarClientLike
  }
}

function loadGoogleApis(): GoogleApisLike {
  const googleModule = require('googleapis') as {
    google?: {
      auth?: {
        OAuth2?: OAuth2CtorLike
      }
      calendar?: (input: { version: 'v3'; auth: OAuth2ClientLike }) => CalendarClientLike
    }
  }
  const google = googleModule.google
  const OAuth2Ctor = google?.auth?.OAuth2
  const calendarFactory = google?.calendar

  if (!google || !OAuth2Ctor || typeof calendarFactory !== 'function') {
    throw new Error('googleapis calendar dependencies are unavailable')
  }

  return {
    google: {
      auth: { OAuth2: OAuth2Ctor },
      calendar: calendarFactory,
    },
  }
}

function getGoogleOAuthConfig() {
  const clientId = env.GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  const redirectUri = env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth configuration is incomplete')
  }

  return { clientId, clientSecret, redirectUri }
}

function parseMetadata(metadata: CalendarEventSelect['metadata']): CalendarEventMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {}
  }

  const value = metadata as Record<string, JsonValue>
  const result: CalendarEventMetadata = {}

  if (typeof value.calendarId === 'string') {
    result.calendarId = value.calendarId
  }
  if (typeof value.deletedAt === 'string' || value.deletedAt === null) {
    result.deletedAt = value.deletedAt
  }
  if (typeof value.lastSyncedAt === 'string' || value.lastSyncedAt === null) {
    result.lastSyncedAt = value.lastSyncedAt
  }
  if (typeof value.syncError === 'string' || value.syncError === null) {
    result.syncError = value.syncError
  }

  return result
}

function buildMetadata(
  metadata: CalendarEventMetadata,
): NonNullable<CalendarEventInsert['metadata']> {
  const next: Record<string, JsonValue> = {}

  if (metadata.calendarId) {
    next.calendarId = metadata.calendarId
  }
  if (metadata.deletedAt !== undefined) {
    next.deletedAt = metadata.deletedAt
  }
  if (metadata.lastSyncedAt !== undefined) {
    next.lastSyncedAt = metadata.lastSyncedAt
  }
  if (metadata.syncError !== undefined) {
    next.syncError = metadata.syncError
  }

  return next
}

function normalizeEventOutput(event: CalendarEventSelect): CalendarEventSelect {
  return event
}

export interface GoogleTokens {
  accessToken: string
  refreshToken?: string | undefined
}

export interface SyncResult {
  success: boolean
  created: number
  updated: number
  deleted: number
  errors: string[]
}

export interface GoogleCalendarSyncStatus {
  lastSyncedAt: Date | null
  syncError: string | null
  eventCount: number
}

export function convertGoogleCalendarEvent(
  googleEvent: GoogleCalendarEvent,
  calendarId: string,
  userId: string,
): CalendarEventInsert {
  if (!googleEvent.id) {
    throw new Error('Google Calendar event must have an id')
  }

  const nowIso = new Date().toISOString()
  const startDateTime = googleEvent.start?.dateTime || googleEvent.start?.date || nowIso
  const endDateTime = googleEvent.end?.dateTime || googleEvent.end?.date || null

  return {
    id: uuidv7(),
    userId,
    eventType: 'event',
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description || null,
    startTime: startDateTime,
    endTime: endDateTime,
    allDay: Boolean(googleEvent.start?.date && !googleEvent.start?.dateTime),
    source: 'google_calendar',
    externalId: googleEvent.id,
    metadata: buildMetadata({
      calendarId,
      deletedAt: null,
      lastSyncedAt: nowIso,
      syncError: null,
    }),
  }
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2ClientLike
  private calendar: CalendarClientLike
  private userId: string

  constructor(userId: string, tokens: GoogleTokens) {
    this.userId = userId

    const { google } = loadGoogleApis()
    const OAuth2Ctor = google.auth.OAuth2
    const oauthConfig = getGoogleOAuthConfig()

    this.oauth2Client = new OAuth2Ctor(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      oauthConfig.redirectUri,
    )

    if (typeof this.oauth2Client?.setCredentials !== 'function') {
      this.oauth2Client.setCredentials = () => undefined
      this.oauth2Client.refreshAccessToken = async () => ({ credentials: {} })
    }

    const credentials: { access_token: string; refresh_token?: string | null } = {
      access_token: tokens.accessToken,
    }
    if (tokens.refreshToken) {
      credentials.refresh_token = tokens.refreshToken
    }

    this.oauth2Client.setCredentials(credentials)

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

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
    }

    try {
      const googleEvents: GoogleCalendarEvent[] = []
      let pageToken: string | undefined

      const timeMinParam = timeMin || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

      do {
        const listParams: CalendarListParams = {
          calendarId,
          timeMin: timeMinParam,
          maxResults: 2500,
          singleEvents: true,
          orderBy: 'startTime',
        }
        if (timeMax) {
          listParams.timeMax = timeMax
        }
        if (pageToken) {
          listParams.pageToken = pageToken
        }
        const response = await this.calendar.events.list(listParams)

        if (response.data.items) {
          googleEvents.push(...response.data.items)
        }
        pageToken = response.data.nextPageToken || undefined
      } while (pageToken)

      logger.info('Fetched events from Google Calendar', {
        userId: this.userId,
        calendarId,
        count: googleEvents.length,
      })

      const existingEvents = await db
        .select({
          id: calendarEvents.id,
          externalId: calendarEvents.externalId,
          updatedAt: calendarEvents.updatedAt,
          metadata: calendarEvents.metadata,
        })
        .from(calendarEvents)
        .where(and(eq(calendarEvents.userId, this.userId), eq(calendarEvents.source, 'google_calendar')))

      const existingEventsByExternalId = new Map(
        existingEvents
          .filter((event) => {
            if (!event.externalId) {
              return false
            }
            const metadata = parseMetadata(event.metadata)
            return metadata.calendarId === calendarId
          })
          .map((event) => [event.externalId!, event]),
      )

      const googleEventIds = new Set<string>()

      for (const googleEvent of googleEvents) {
        if (!googleEvent.id) {
          continue
        }

        googleEventIds.add(googleEvent.id)

        try {
          const eventData = convertGoogleCalendarEvent(googleEvent, calendarId, this.userId)
          const existingEvent = existingEventsByExternalId.get(googleEvent.id)

          if (existingEvent) {
            const googleUpdated = googleEvent.updated ? new Date(googleEvent.updated) : null
            const localUpdated = existingEvent.updatedAt ? new Date(existingEvent.updatedAt) : null

            if (
              !googleUpdated ||
              !localUpdated ||
              googleUpdated.getTime() > localUpdated.getTime()
            ) {
              await db
                .update(calendarEvents)
                .set({
                  ...eventData,
                  id: existingEvent.id,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(calendarEvents.id, existingEvent.id))
              result.updated++
            }
          } else {
            await db.insert(calendarEvents).values(eventData)
            result.created++
          }
        } catch (error) {
          result.errors.push(
            `Failed to process event ${googleEvent.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
        }
      }

      const idsToMarkDeleted: string[] = existingEvents
        .filter((event) => {
          if (!event.externalId || googleEventIds.has(event.externalId)) {
            return false
          }
          const metadata = parseMetadata(event.metadata)
          return !metadata.deletedAt
        })
        .map((event) => event.id)

      if (idsToMarkDeleted.length > 0) {
        const CHUNK_SIZE = 500
        for (let i = 0; i < idsToMarkDeleted.length; i += CHUNK_SIZE) {
          const chunk = idsToMarkDeleted.slice(i, i + CHUNK_SIZE)
          const nowIso = new Date().toISOString()
          const eventsInChunk = await db
            .select({ id: calendarEvents.id, metadata: calendarEvents.metadata })
            .from(calendarEvents)
            .where(inArray(calendarEvents.id, chunk))

          for (const event of eventsInChunk) {
            const metadata = parseMetadata(event.metadata)
            await db
              .update(calendarEvents)
              .set({
                metadata: buildMetadata({
                  ...metadata,
                  deletedAt: nowIso,
                }),
                updatedAt: nowIso,
              })
              .where(eq(calendarEvents.id, event.id))
          }
          result.deleted += chunk.length
        }
      }

      logger.info('Google Calendar sync completed', {
        userId: this.userId,
        calendarId,
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        errors: result.errors.length,
      })
    } catch (error) {
      result.success = false
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(`Failed to sync Google Calendar: ${errorMessage}`)
      logger.error('Google Calendar sync failed', {
        userId: this.userId,
        calendarId,
        error: errorMessage,
      })
    }

    return result
  }

  async pushEventToGoogle(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const eventData = (
        await db.select().from(calendarEvents).where(eq(calendarEvents.id, eventId)).limit(1)
      ).map(normalizeEventOutput)

      if (eventData.length === 0) {
        return { success: false, error: 'Event not found' }
      }

      const event = eventData[0]
      if (!event) {
        return { success: false, error: 'Event not found' }
      }

      const metadata = parseMetadata(event.metadata)
      const calendarId = metadata.calendarId || 'primary'

      const googleEvent: Record<string, JsonValue> = {
        summary: event.title,
        description: event.description ?? null,
        start: {
          dateTime: event.startTime,
        },
        end: {
          dateTime: event.endTime ?? event.startTime,
        },
      }

      if (event.externalId) {
        await this.calendar.events.update({
          calendarId,
          eventId: event.externalId,
          requestBody: googleEvent,
        })
      } else {
        const result = await this.calendar.events.insert({
          calendarId,
          requestBody: googleEvent,
        })

        await db
          .update(calendarEvents)
          .set({
            externalId: result.data.id || null,
            source: 'google_calendar',
            metadata: buildMetadata({
              ...metadata,
              calendarId,
              lastSyncedAt: new Date().toISOString(),
              syncError: null,
            }),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(calendarEvents.id, eventId))
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to push event to Google Calendar', {
        eventId,
        userId: this.userId,
        error: errorMessage,
      })
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async deleteEventFromGoogle(
    eventId: string,
    calendarId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      })
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to delete event from Google Calendar', {
        eventId,
        calendarId,
        userId: this.userId,
        error: errorMessage,
      })
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async getCalendarList(): Promise<Array<{ id: string; summary: string }>> {
    try {
      const response = await this.calendar.calendarList.list()
      return (
        response.data.items
          ?.filter(
            (item): item is { id: string; summary: string } =>
              typeof item.id === 'string' && typeof item.summary === 'string',
          )
          .map((item) => ({
            id: item.id,
            summary: item.summary,
          })) || []
      )
    } catch (error) {
      logger.error('Error fetching calendar list', {
        userId: this.userId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error('Failed to fetch calendar list')
    }
  }

  async getSyncStatus(): Promise<GoogleCalendarSyncStatus> {
    const syncedEvents = await db
      .select({
        updatedAt: calendarEvents.updatedAt,
        metadata: calendarEvents.metadata,
      })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, this.userId), eq(calendarEvents.source, 'google_calendar')))
      .orderBy(asc(calendarEvents.updatedAt))

    const lastEvent = syncedEvents[syncedEvents.length - 1]
    const metadata = lastEvent ? parseMetadata(lastEvent.metadata) : {}

    return {
      lastSyncedAt: metadata.lastSyncedAt ? new Date(metadata.lastSyncedAt) : null,
      syncError: metadata.syncError ?? null,
      eventCount: syncedEvents.length,
    }
  }
}

export async function refreshGoogleToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const { google } = loadGoogleApis()
    const OAuth2Ctor = google.auth.OAuth2
    const oauthConfig = getGoogleOAuthConfig()

    const oauth2Client = new OAuth2Ctor(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      oauthConfig.redirectUri,
    )

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
      return null
    }

    return {
      accessToken: credentials.access_token,
      expiresIn: credentials.expiry_date || 3600,
    }
  } catch (error) {
    logger.error('Failed to refresh Google token', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
