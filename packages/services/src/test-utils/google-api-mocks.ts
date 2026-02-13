import { type Mock, vi } from 'vitest';

export const mockOAuth2Client = {
  setCredentials: vi.fn() as Mock,
  refreshAccessToken: vi.fn() as Mock,
  generateAuthUrl: vi.fn() as Mock,
  getToken: vi.fn() as Mock,
};

export const mockCalendar = {
  events: {
    list: vi.fn() as Mock,
    insert: vi.fn() as Mock,
    update: vi.fn() as Mock,
    delete: vi.fn() as Mock,
  },
  calendarList: {
    list: vi.fn() as Mock,
  },
};

export const mockPlaces = {
  searchText: vi.fn() as Mock,
  get: vi.fn() as Mock,
};

const OAuth2Mock = class {
  setCredentials = mockOAuth2Client.setCredentials;
  refreshAccessToken = mockOAuth2Client.refreshAccessToken;
  generateAuthUrl = mockOAuth2Client.generateAuthUrl;
  getToken = mockOAuth2Client.getToken;
};

export const googleapi = {
  Auth: {
    OAuth2Client: OAuth2Mock,
  },
  google: {
    auth: {
      OAuth2: OAuth2Mock,
    },
    calendar: vi.fn(() => mockCalendar) as Mock,
    places: vi.fn(() => ({
      places: mockPlaces,
    })) as Mock,
  },
};
