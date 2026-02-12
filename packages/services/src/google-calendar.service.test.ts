import { db } from '@hominem/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { convertGoogleCalendarEvent, GoogleCalendarService } from './google-calendar.service';

// Mock googleapis
vi.mock('googleapis', () => {
  const mockEventsList = vi.fn();
  const mockEventsInsert = vi.fn().mockResolvedValue({ data: { id: 'new-google-id' } });
  const mockEventsUpdate = vi.fn().mockResolvedValue({ data: { id: 'updated-google-id' } });
  const mockEventsDelete = vi.fn().mockResolvedValue({});
  const mockCalendarListList = vi.fn().mockResolvedValue({
    data: {
      items: [
        { id: 'primary', summary: 'Primary Calendar' },
        { id: 'work', summary: 'Work Calendar' },
      ],
    },
  });

  return {
    google: {
      calendar: vi.fn(() => ({
        events: {
          list: mockEventsList,
          insert: mockEventsInsert,
          update: mockEventsUpdate,
          delete: mockEventsDelete,
        },
        calendarList: {
          list: mockCalendarListList,
        },
      })),
    },
    Auth: {
      OAuth2Client: vi.fn().mockImplementation(function (this: any) {
        this.setCredentials = vi.fn();
        this.refreshAccessToken = vi.fn().mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            expiry_date: Date.now() + 3600000,
          },
        });
      }),
    },
  };
});

// Mock @hominem/db
vi.mock('@hominem/db', async (importOriginal) => {
  const actual = await importOriginal<any>();

  const mockWhere = vi.fn().mockImplementation(() => {
    const promise = Promise.resolve([]) as any;
    promise.orderBy = vi.fn().mockReturnValue(promise);
    promise.limit = vi.fn().mockReturnValue(promise);
    return promise;
  });

  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  const mockOnConflict = vi.fn().mockResolvedValue([]);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  const mockUpdateWhere = vi.fn().mockResolvedValue([]);
  const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

  return {
    ...actual,
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      query: {
        events: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
      },
    },
  };
});

// Mock @hominem/db/schema/calendar
vi.mock('@hominem/db/schema/calendar', () => ({
  events: {
    id: 'id',
    userId: 'userId',
    calendarId: 'calendarId',
    source: 'source',
    externalId: 'externalId',
    updatedAt: 'updatedAt',
    lastSyncedAt: 'lastSyncedAt',
    syncError: 'syncError',
    deletedAt: 'deletedAt',
    title: 'title',
    description: 'description',
    date: 'date',
    dateStart: 'dateStart',
    dateEnd: 'dateEnd',
  },
  eventsUsers: {},
  eventsTags: {},
  eventsTransactions: {},
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
  sql: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
}));

describe('GoogleCalendarService', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a service instance with valid tokens', () => {
      const service = new GoogleCalendarService(mockUserId, mockTokens);
      expect(service).toBeDefined();
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status with no events', async () => {
      const service = new GoogleCalendarService(mockUserId, mockTokens);

      // Setup mock to return empty array
      const mockOrderBy = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const status = await service.getSyncStatus();

      expect(status).toEqual({
        lastSyncedAt: null,
        syncError: null,
        eventCount: 0,
      });
    });
  });

  describe('convertGoogleCalendarEvent', () => {
    it('should convert Google Calendar event to internal format', () => {
      const googleEvent = {
        id: 'google-event-1',
        summary: 'Test Event',
        description: 'Test Description',
        start: {
          dateTime: '2024-01-01T10:00:00Z',
        },
        end: {
          dateTime: '2024-01-01T11:00:00Z',
        },
      };

      const result = convertGoogleCalendarEvent(googleEvent, 'primary', mockUserId);

      expect(result.title).toBe('Test Event');
      expect(result.description).toBe('Test Description');
      expect(result.source).toBe('google_calendar');
      expect(result.externalId).toBe('google-event-1');
      expect(result.calendarId).toBe('primary');
      expect(result.userId).toBe(mockUserId);
    });

    it('should handle events without description', () => {
      const googleEvent = {
        id: 'google-event-2',
        summary: 'Test Event',
        start: {
          dateTime: '2024-01-01T10:00:00Z',
        },
        end: {
          dateTime: '2024-01-01T11:00:00Z',
        },
      };

      const result = convertGoogleCalendarEvent(googleEvent, 'primary', mockUserId);

      expect(result.title).toBe('Test Event');
      expect(result.description).toBeNull();
    });

    it('should use default title for events without summary', () => {
      const googleEvent = {
        id: 'google-event-3',
        summary: '',
        start: {
          dateTime: '2024-01-01T10:00:00Z',
        },
        end: {
          dateTime: '2024-01-01T11:00:00Z',
        },
      };

      const result = convertGoogleCalendarEvent(googleEvent, 'primary', mockUserId);

      expect(result.title).toBe('Untitled Event');
    });
  });

  describe('syncGoogleCalendarEvents', () => {
    it('should sync events and handle pagination', async () => {
      const service = new GoogleCalendarService(mockUserId, mockTokens);

      const mockList = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            items: [{ id: 'event-1', summary: 'Event 1' }],
            nextPageToken: 'page-2',
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [{ id: 'event-2', summary: 'Event 2' }],
          },
        });

      // @ts-ignore - access private calendar to mock
      service.calendar.events.list = mockList;

      // Mock db.select to return empty array (no existing events)
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await service.syncGoogleCalendarEvents();

      expect(result.success).toBe(true);
      expect(result.created).toBe(2);
      expect(mockList).toHaveBeenCalledTimes(2);
    });

    it('should handle deletions', async () => {
      const service = new GoogleCalendarService(mockUserId, mockTokens);

      const mockList = vi.fn().mockResolvedValue({
        data: {
          items: [{ id: 'event-1', summary: 'Event 1' }],
        },
      });

      // @ts-ignore
      service.calendar.events.list = mockList;

      // Mock db.select to return one existing event that is NOT in googleEvents
      const mockWhere = vi.fn().mockResolvedValue([
        {
          id: 'old-event-id',
          externalId: 'event-removed',
          calendarId: 'primary',
          userId: mockUserId,
        },
      ]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await service.syncGoogleCalendarEvents();

      expect(result.deleted).toBe(1);
    });
  });
});
