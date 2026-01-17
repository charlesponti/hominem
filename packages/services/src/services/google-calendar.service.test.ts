import { beforeEach, describe, expect, it, vi } from 'vitest';
import { convertGoogleCalendarEvent, GoogleCalendarService } from './google-calendar.service';

// Mock googleapis
vi.mock('googleapis', () => import('../test-utils/google-api-mocks').then((m) => m.googleapi));

// Mock database
vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockImplementation(() => {
          const promise = Promise.resolve([]) as any;
          promise.orderBy = vi.fn().mockReturnValue(promise);
          return promise;
        }),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => Promise.resolve()),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

describe('GoogleCalendarService', () => {
  const mockUserId = 'user-123';
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

      const { db } = await import('../db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValue([
              { id: 'old-event-id', externalId: 'event-removed', calendarId: 'primary' },
            ]),
        }),
      } as any);

      const result = await service.syncGoogleCalendarEvents();

      expect(result.deleted).toBe(1);
    });
  });
});
