import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  convertGoogleCalendarEvent,
  GoogleCalendarService,
} from "./google-calendar.service";

// Mock the google-auth-library
vi.mock("google-auth-library", () => {
  class MockOAuth2Client {
    setCredentials = vi.fn();
  }
  return {
    OAuth2Client: MockOAuth2Client,
  };
});

// Mock googleapis
vi.mock("googleapis", () => ({
  google: {
    calendar: vi.fn(() => ({
      events: {
        list: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      calendarList: {
        list: vi.fn(),
      },
    })),
  },
}));

// Mock database
vi.mock("../db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

describe("GoogleCalendarService", () => {
  const mockUserId = "user-123";
  const mockTokens = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create a service instance with valid tokens", () => {
      const service = new GoogleCalendarService(mockUserId, mockTokens);
      expect(service).toBeDefined();
    });
  });

  describe("getSyncStatus", () => {
    it("should return sync status with no events", async () => {
      const service = new GoogleCalendarService(mockUserId, mockTokens);
      const status = await service.getSyncStatus();

      expect(status).toEqual({
        lastSyncedAt: null,
        syncError: null,
        eventCount: 0,
      });
    });
  });

  describe("convertGoogleCalendarEvent", () => {
    it("should convert Google Calendar event to internal format", () => {
      const googleEvent = {
        id: "google-event-1",
        summary: "Test Event",
        description: "Test Description",
        start: {
          dateTime: "2024-01-01T10:00:00Z",
        },
        end: {
          dateTime: "2024-01-01T11:00:00Z",
        },
      };

      const result = convertGoogleCalendarEvent(
        googleEvent,
        "primary",
        mockUserId
      );

      expect(result.title).toBe("Test Event");
      expect(result.description).toBe("Test Description");
      expect(result.source).toBe("google_calendar");
      expect(result.externalId).toBe("google-event-1");
      expect(result.calendarId).toBe("primary");
      expect(result.userId).toBe(mockUserId);
    });

    it("should handle events without description", () => {
      const googleEvent = {
        id: "google-event-2",
        summary: "Test Event",
        start: {
          dateTime: "2024-01-01T10:00:00Z",
        },
        end: {
          dateTime: "2024-01-01T11:00:00Z",
        },
      };

      const result = convertGoogleCalendarEvent(
        googleEvent,
        "primary",
        mockUserId
      );

      expect(result.title).toBe("Test Event");
      expect(result.description).toBeNull();
    });

    it("should use default title for events without summary", () => {
      const googleEvent = {
        id: "google-event-3",
        summary: "",
        start: {
          dateTime: "2024-01-01T10:00:00Z",
        },
        end: {
          dateTime: "2024-01-01T11:00:00Z",
        },
      };

      const result = convertGoogleCalendarEvent(
        googleEvent,
        "primary",
        mockUserId
      );

      expect(result.title).toBe("Untitled Event");
    });
  });
});
